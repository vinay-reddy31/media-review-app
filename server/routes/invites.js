// server/routes/invites.js
import express from "express";
import crypto from "crypto";
import Invite from "../models/Invite.js";
import Media from "../models/Media.js";
import MediaAccess from "../models/MediaAccess.js";
import ShareLink from "../models/ShareLink.js";
import { verifyKeycloakToken } from "../middleware/verifyKeycloakToken.js";
import { requireRole } from "../middleware/requireRole.js";
import { inviteUserToOrg, inviteExistingUserToOrg, assignRealmRoles, createOrganizationForUser, createClientForOrg, getOrganizationByName, addUserToOrg, isUserInOrg, getClientByClientId, ensureClientRoles, assignClientRoles, getOrganizationById, ensureOrgClientByOrgId } from "../utils/keycloakAdmin.js";
import OrganizationService from "../services/organizationService.js";
import { Organization, Client, Role, UserOrganizationMap } from "../models/index.js";

const router = express.Router();

// Create invite link (owner/admin)
router.post("/", verifyKeycloakToken, requireRole("owner"), async (req, res) => {
  try {
    const { email, role, orgId, mediaId } = req.body;
    if (!email || !role) return res.status(400).json({ error: "email and role are required" });

    // If orgId not provided, ensure inviter has an org and use it
    let targetOrgId = orgId;
    if (!targetOrgId) {
      const usernamePart = (req.user.preferred_username || req.user.email || req.user.sub).split("@")[0];
      const orgName = `org-${usernamePart}`;
      const { organization } = await OrganizationService.createOrganizationWithClient(req.user.sub, orgName, req.user.email);
      // Use Keycloak ID for subsequent calls
      targetOrgId = organization?.keycloakId || null;
    }
    // Normalize to Keycloak org internal id (UUID). If a name was provided, resolve id.
    const looksLikeUUID = (v) => typeof v === "string" && v.includes("-") && v.length >= 8;
    if (targetOrgId && !looksLikeUUID(String(targetOrgId))) {
      try {
        const byName = await getOrganizationByName({ name: String(targetOrgId) });
        if (byName?.id) targetOrgId = byName.id;
      } catch (_) {}
    }
    if (!targetOrgId) return res.status(500).json({ error: "Failed to resolve target organization id" });

    const token = crypto.randomBytes(24).toString("base64url");
    await Invite.create({ email, role, orgId: String(targetOrgId), mediaId: mediaId ?? null, token, invitedBy: req.user.sub });

    // Optionally call Keycloak invite endpoint upfront
    try {
      await inviteUserToOrg({ orgId: String(targetOrgId), email, role });
    } catch (e) {
      // Log but don't fail invite creation if Keycloak invite API not available
      console.warn("Keycloak invite call failed:", e.message);
    }

    const url = `${process.env.CLIENT_URL || "http://localhost:3001"}/share/${token}`;
    res.json({ url, token });
  } catch (err) {
    console.error("create invite error", err);
    res.status(500).json({ error: err.message });
  }
});

// Check invite by token
router.get("/:token", async (req, res) => {
  try {
    const invite = await Invite.findOne({ where: { token: req.params.token } });
    if (!invite) return res.status(404).json({ error: "Invalid invite" });
    res.json({ email: invite.email, role: invite.role, orgId: invite.orgId, status: invite.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept invite after login/registration
router.post("/:token/accept", verifyKeycloakToken, async (req, res) => {
  try {
    const invite = await Invite.findOne({ where: { token: req.params.token } });
    if (!invite) return res.status(404).json({ error: "Invalid invite" });

    const debug = { steps: [] };
    const push = (msg, extra = {}) => debug.steps.push({ msg, ...extra });

    // 0) Ensure membership using official endpoints, then verify membership
    let membershipEnsured = false;
    // Normalize org id before calling KC
    let kcOrgId = invite.orgId;
    const looksLikeUUID2 = (v) => typeof v === "string" && v.includes("-") && v.length >= 8;
    if (kcOrgId && !looksLikeUUID2(String(kcOrgId))) {
      try {
        const byName = await getOrganizationByName({ name: String(kcOrgId) });
        if (byName?.id) kcOrgId = byName.id;
      } catch (_) {}
    }

    try {
      const addResult = await addUserToOrg({ orgId: kcOrgId, userId: req.user.sub, role: invite.role });
      push("addUserToOrg OK", { orgId: invite.orgId, attempt: addResult?.attempt });
      membershipEnsured = true;
    } catch (e) {
      console.warn("addUserToOrg failed, trying invite-existing-user:", e.message);
      push("addUserToOrg FAILED", { error: e.message });
      let invitedById = false;
      try {
        const res0 = await inviteExistingUserToOrg({ orgId: kcOrgId, userId: req.user.sub });
        push("inviteExistingUserToOrg OK", { orgId: invite.orgId });
        membershipEnsured = true;
        invitedById = true;
      } catch (e2) {
        console.warn("invite-existing-user also failed:", e2.message);
        push("inviteExistingUserToOrg FAILED", { error: e2.message });
      }
      if (!invitedById) {
        // Fallback: invite by email of the now-registered user
        try {
          await inviteUserToOrg({ orgId: kcOrgId, email: req.user.email, role: invite.role });
          push("inviteUserToOrg(email) OK", { email: req.user.email });
          membershipEnsured = true;
        } catch (e3) {
          push("inviteUserToOrg(email) FAILED", { error: e3.message, email: req.user.email });
        }
      }
    }
    // Verify membership landed
    try {
      const inOrg = await isUserInOrg({ orgId: invite.orgId, userId: req.user.sub });
      push("membership check", { inOrg });
      membershipEnsured = membershipEnsured && inOrg;
    } catch (e) {
      push("membership check FAILED", { error: e.message });
    }

    // No local DB persistence for org/membership; membership is managed in Keycloak only

    // 1) Assign client roles for inviter's org client (org-scoped roles)
    const orgScopedRoles = [invite.role];
    try {
      const kcClient = await ensureOrgClientByOrgId({ orgId: kcOrgId });
      if (!kcClient) throw new Error(`Org client not found for orgId: ${invite.orgId}`);
      await ensureClientRoles({ clientKeycloakId: kcClient.id, roleNames: ["owner", "reviewer", "viewer"] });
      await assignClientRoles({ userId: req.user.sub, clientKeycloakId: kcClient.id, roleNames: orgScopedRoles });
      push("assignClientRoles OK", { clientId: kcClient.clientId, roles: orgScopedRoles });

      // Mirror to local DB
      try {
        let kcOrg = null;
        try { kcOrg = await getOrganizationById({ orgId: kcOrgId }); } catch (_) {}
        const orgName = kcOrg?.name || String(invite.orgId);
        const baseName = orgName.startsWith('org-') ? orgName.slice(4) : orgName;

        const [dbOrg] = await Organization.findOrCreate({
          where: { name: orgName },
          defaults: { keycloakId: kcOrg?.id || String(kcOrgId), status: "active" },
        });

        const [dbClient] = await Client.findOrCreate({
          where: { clientId: kcClient.clientId || `client-${baseName}` },
          defaults: { keycloakId: kcClient.id, name: kcClient.clientId || `client-${baseName}`, organizationId: dbOrg.id },
        });

        const roleNames = ["owner", "reviewer", "viewer"];
        const dbRoles = {};
        for (const rn of roleNames) {
          const [r] = await Role.findOrCreate({ where: { name: rn, clientId: dbClient.id }, defaults: { name: rn, clientId: dbClient.id } });
          dbRoles[rn] = r;
        }

        const selectedRole = dbRoles[invite.role];
        if (selectedRole) {
          await UserOrganizationMap.findOrCreate({
            where: { userId: req.user.sub, organizationId: dbOrg.id, clientId: dbClient.id },
            defaults: { roleId: selectedRole.id, roleName: invite.role, assignedBy: invite.invitedBy || null },
          });
        }

        push("dbMirror OK", { organization: orgName, clientId: kcClient.clientId, role: invite.role });
      } catch (e2) {
        push("dbMirror FAILED", { error: e2.message });
      }
    } catch (e) {
      push("assignClientRoles FAILED", { error: e.message, roles: orgScopedRoles });
    }

    // 2) Grant media access if this invite was tied to a specific media
    let grantedMediaFromInvite = 0;
    try {
      if (invite.mediaId) {
        await MediaAccess.upsert({ mediaId: invite.mediaId, userId: req.user.sub, role: invite.role });
        grantedMediaFromInvite = 1;
        push("grantMediaFromInvite OK", { mediaId: invite.mediaId, role: invite.role });
      }
    } catch (e) {
      push("grantMediaFromInvite FAILED", { error: e.message });
    }

    // 3) If new user flow: create org and client for them, assign owner role for their org
    // Here we consider "new user" as: req.user.email doesn't match any prior accepted invites
    const priorAccepted = await Invite.count({ where: { email: req.user.email, status: "accepted" } });
    if (priorAccepted === 0) {
      const usernamePart = (req.user.preferred_username || req.user.email || req.user.sub).split("@")[0];
      const orgName = `org-${usernamePart}`;

      // Create org if not exists
      let org = await getOrganizationByName({ name: orgName }).catch((e) => { push("getOrganizationByName FAILED", { error: e.message }); return null; });
      push("getOrganizationByName", { orgName, found: !!org });
      if (!org) {
        org = await createOrganizationForUser({ 
          userId: req.user.sub, 
          name: orgName,
          email: req.user.email,
          username: req.user.preferred_username || req.user.email,
          firstName: req.user.given_name || req.user.name?.split(' ')[0] || 'User',
          lastName: req.user.family_name || req.user.name?.split(' ')[1] || 'Name'
        });
        push("createOrganizationForUser OK", { orgName, orgId: org?.id || org?._id || org?.orgId });
      }

      // Ensure user is member of their own org as owner
      try {
        const addOwnerRes = await addUserToOrg({ orgId: org.id || org._id || org.orgId || invite.orgId, userId: req.user.sub, role: "owner" });
        push("addUserToOrg(owner) OK", { orgId: org.id || org._id || org.orgId || invite.orgId, attempt: addOwnerRes?.attempt });
      } catch (e) {
        console.warn("addUserToOrg(owner) warning:", e.message);
        push("addUserToOrg(owner) FAILED", { error: e.message });
      }

      // Create a dedicated client for the org (optional, can be adapted)
      const clientId = `client-${orgName.startsWith('org-') ? orgName.slice(4) : orgName}`;
      try {
        await createClientForOrg({ clientId, name: `${orgName}-client` });
        push("createClientForOrg OK", { clientId });
        // No local DB persistence for client; client exists in Keycloak only
      } catch (e) {
        console.warn("createClientForOrg failed:", e.message);
        push("createClientForOrg FAILED", { error: e.message });
      }

      // Assign owner role (client role) for their new org context
      try {
        const newOrgClient = await getClientByClientId({ clientId });
        if (newOrgClient) {
          await ensureClientRoles({ clientKeycloakId: newOrgClient.id, roleNames: ["owner", "reviewer", "viewer"] });
          await assignClientRoles({ userId: req.user.sub, clientKeycloakId: newOrgClient.id, roleNames: ["owner"] });
          push("assignClientRoles(owner) OK", { clientId });
        } else {
          push("assignClientRoles(owner) SKIPPED", { reason: "client not resolved" });
        }
      } catch (e) {
        push("assignClientRoles(owner) FAILED", { error: e.message });
      }

      invite.status = "registered";
    } else {
      invite.status = "accepted";
    }

    // 4) Grant access for any pending email-restricted media share links for this invite email
    let grantedAccessCount = 0;
    try {
      const emailLower = (invite.email || req.user.email || "").toLowerCase();
      if (emailLower) {
        const pendingLinks = await ShareLink.findAll({ where: { inviteeEmail: emailLower, shareType: "email" } });
        for (const link of pendingLinks) {
          await MediaAccess.upsert({ mediaId: link.mediaId, userId: req.user.sub, role: link.grantedRole });
          grantedAccessCount += 1;
        }
        push("mediaGrantsFromEmailLinks", { count: grantedAccessCount });
      }
    } catch (e) {
      push("mediaGrantsFromEmailLinks FAILED", { error: e.message });
    }

    // 5) Optionally share inviter's existing media with the invitee for immediate visibility
    let autoGrantedOwnerMediaCount = 0;
    try {
      const enableAutoShare = String(process.env.ENABLE_AUTO_SHARE_INVITER_MEDIA || 'false').toLowerCase() === 'true';
      if (enableAutoShare && invite.invitedBy && ["reviewer", "viewer"].includes(invite.role)) {
        const ownersMedia = await Media.findAll({ where: { ownerId: invite.invitedBy } });
        for (const m of ownersMedia) {
          await MediaAccess.upsert({ mediaId: m.id, userId: req.user.sub, role: invite.role });
          autoGrantedOwnerMediaCount += 1;
        }
        push("autoShareInvitersMedia", { count: autoGrantedOwnerMediaCount });
      } else {
        push("autoShareInvitersMedia SKIPPED", { reason: "disabled or not applicable" });
      }
    } catch (e) {
      push("autoShareInvitersMedia FAILED", { error: e.message });
    }

    await invite.save();
    res.json({ ok: true, debug, grantedAccessCount, autoGrantedOwnerMediaCount, grantedMediaFromInvite, membershipEnsured, nextRole: invite.role, redirectMediaId: invite.mediaId || null });
  } catch (err) {
    console.error("accept invite error", err);
    res.status(500).json({ error: err.message, where: "accept-invite" });
  }
});

// Reject invite
router.post("/:token/reject", verifyKeycloakToken, async (req, res) => {
  try {
    const invite = await Invite.findOne({ where: { token: req.params.token } });
    if (!invite) return res.status(404).json({ error: "Invalid invite" });

    invite.status = "rejected";
    await invite.save();

    res.json({ ok: true, status: invite.status });
  } catch (err) {
    console.error("reject invite error", err);
    res.status(500).json({ error: err.message, where: "reject-invite" });
  }
});

export default router;
