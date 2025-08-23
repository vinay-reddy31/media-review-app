// server/utils/keycloakAdmin.js
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = process.env.KEYCLOAK_AUTH_SERVER_URL || "http://localhost:8080";
const REALM = process.env.KEYCLOAK_REALM || "master";
const ADMIN_CLIENT_ID = process.env.KEYCLOAK_ADMIN_CLIENT_ID || process.env.KEYCLOAK_CLIENT_ID;
const ADMIN_CLIENT_SECRET = process.env.KEYCLOAK_ADMIN_CLIENT_SECRET || process.env.KEYCLOAK_CLIENT_SECRET;
const ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN_USERNAME; // e.g., 'admin'
const ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD; // e.g., 'admin'
const ADMIN_TOKEN_REALM = process.env.KEYCLOAK_ADMIN_TOKEN_REALM || "master"; // password grant realm per Postman flow

function buildUrl(path) {
  return `${BASE_URL}${path}`;
}

export async function getAdminToken() {
  const clientCredsUrl = buildUrl(`/realms/${ADMIN_TOKEN_REALM}/protocol/openid-connect/token`);
  const passwordGrantUrl = buildUrl(`/realms/${ADMIN_TOKEN_REALM}/protocol/openid-connect/token`);

  // Prefer client_credentials if configured; otherwise fall back to password grant (admin-cli)
  if (ADMIN_CLIENT_ID && ADMIN_CLIENT_SECRET) {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: ADMIN_CLIENT_ID,
      client_secret: ADMIN_CLIENT_SECRET,
    });
    const res = await fetch(clientCredsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Failed to get admin token (client_credentials): ${res.status} ${JSON.stringify(data)}`);
    }
    return data.access_token;
  }

  if (ADMIN_USERNAME && ADMIN_PASSWORD) {
    const body = new URLSearchParams({
      grant_type: "password",
      client_id: "admin-cli",
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
    });
    const res = await fetch(passwordGrantUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Failed to get admin token (password): ${res.status} ${JSON.stringify(data)}`);
    }
    return data.access_token;
  }

  throw new Error("No admin credentials configured. Set KEYCLOAK_ADMIN_CLIENT_ID/SECRET or KEYCLOAK_ADMIN_USERNAME/PASSWORD.");
}

export async function inviteUserToOrg({ orgId, email, role }) {
  const token = await getAdminToken();
  const url = buildUrl(`/admin/realms/${REALM}/organizations/${encodeURIComponent(orgId)}/members/invite-user`);
  const payload = { email, role };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Invite user failed: ${res.status} ${txt}`);
  }
  return res.json().catch(() => ({}));
}

export async function getOrganizationByName({ name }) {
  const token = await getAdminToken();
  const url = buildUrl(`/admin/realms/${REALM}/organizations?search=${encodeURIComponent(name)}`);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Get org by name failed: ${res.status} ${JSON.stringify(data)}`);
  }
  if (Array.isArray(data)) {
    return data.find((o) => o.name === name) || null;
  }
  return null;
}

export async function addUserToOrg({ orgId, userId, role }) {
  const token = await getAdminToken();
  // Primary shape: POST /members with body { userId, role }
  const url = buildUrl(`/admin/realms/${REALM}/organizations/${encodeURIComponent(orgId)}/members`);
  const membershipType = role === "owner" ? "admin" : "member";
  const membershipTypeUpper = role === "owner" ? "ADMIN" : "MEMBER";
  
  // Keycloak Organizations API expects specific payload formats
  const attempts = [
    // 1) Raw string format (most common for Keycloak Organizations)
    { method: "POST", url, body: `"${userId}"`, contentType: "application/json" },
    
    // 2) JSON object with id field
    { method: "POST", url, body: { id: userId }, contentType: "application/json" },
    
    // 3) JSON object with userId field
    { method: "POST", url, body: { userId }, contentType: "application/json" },
    
    // 4) Path variant without body (some KC builds)
    { method: "POST", url: `${url}/${encodeURIComponent(userId)}`, body: undefined, headers: { Authorization: `Bearer ${token}` } },
    
    // 5) text/plain body with user id
    { method: "POST", url, body: userId, contentType: "text/plain" },
    
    // 6) application/x-www-form-urlencoded simple
    { method: "POST", url, body: new URLSearchParams({ userId }), contentType: "application/x-www-form-urlencoded" },
    
    // 7) JSON with role information
    { method: "POST", url, body: { userId, role }, contentType: "application/json" },
    { method: "POST", url, body: { userId, membershipType }, contentType: "application/json" },
    { method: "POST", url, body: { userId, membershipType: membershipTypeUpper }, contentType: "application/json" },
    
    // 8) Alternative endpoint for some KC builds
    { method: "POST", url: buildUrl(`/admin/realms/${REALM}/organizations/${encodeURIComponent(orgId)}/users`), body: { userId }, contentType: "application/json" },
    
    // 9) Query parameter fallback
    { method: "POST", url: `${url}?userId=${encodeURIComponent(userId)}`, body: undefined },
  ];

  let lastErrorText = "";
  for (const attempt of attempts) {
    try {
      const hasBody = attempt.body !== undefined;
      const init = {
        method: attempt.method,
        headers: attempt.headers
          ? attempt.headers
          : hasBody
          ? { Authorization: `Bearer ${token}`, "Content-Type": attempt.contentType || "application/json", Accept: "application/json" }
          : { Authorization: `Bearer ${token}`, Accept: "application/json" },
        body: hasBody
          ? attempt.contentType === "text/plain"
            ? String(attempt.body)
            : attempt.contentType === "application/x-www-form-urlencoded"
            ? attempt.body
            : JSON.stringify(attempt.body)
          : undefined,
      };
      
      console.log(`🔍 Trying membership attempt: ${attempt.method} ${attempt.url}`);
      if (hasBody) console.log(`📦 Payload:`, attempt.body);
      
      const res = await fetch(attempt.url, init);
      
      if (res.ok || res.status === 201 || res.status === 204) {
        console.log(`✅ Membership successful with attempt: ${attempt.method} ${attempt.url}`);
        return { ok: true, attempt: `${attempt.method} ${attempt.url}` };
      }
      
      const responseText = await res.text().catch(() => `${res.status}`);
      console.log(`❌ Attempt failed: ${res.status} - ${responseText}`);
      
      // Retry with no content-type if server complains about @Consumes
      if (responseText.includes("@Consumes")) {
        try {
          const headers = { Authorization: `Bearer ${token}` };
          const res2 = await fetch(attempt.url, { method: attempt.method, headers });
          if (res2.ok || res2.status === 201 || res2.status === 204) {
            console.log(`✅ Membership successful with no-content-type retry`);
            return { ok: true, attempt: "no-content-type-retry" };
          }
        } catch (_) {}
      }
      
      lastErrorText = `status=${res.status}, response=${responseText}`;
    } catch (error) {
      console.log(`❌ Attempt error:`, error.message);
      lastErrorText = `error=${error.message}`;
    }
  }

  // Fallback shape: PUT /members/{userId}?role=... (some KC builds use this)
  try {
    const fallbackUrl = buildUrl(`/admin/realms/${REALM}/organizations/${encodeURIComponent(orgId)}/members/${encodeURIComponent(userId)}?role=${encodeURIComponent(role || "member")}`);
    console.log(`🔄 Trying PUT fallback: ${fallbackUrl}`);
    
    const resFallback = await fetch(fallbackUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (resFallback.ok || resFallback.status === 201 || resFallback.status === 204) {
      console.log(`✅ Membership successful with PUT fallback`);
      return { ok: true, attempt: "PUT-members-role" };
    }
    
    const fbText = await resFallback.text().catch(() => `${resFallback.status}`);
    console.log(`❌ PUT fallback failed: ${resFallback.status} - ${fbText}`);
    lastErrorText += `. PUT fallback: ${fbText}`;
  } catch (error) {
    console.log(`❌ PUT fallback error:`, error.message);
    lastErrorText += `. PUT fallback error: ${error.message}`;
  }

  // FINAL FALLBACK: try joining a group named after the org
  try {
    console.log(`🔄 Trying group fallback...`);
    let orgName = String(orgId);
    try {
      const org = await getOrganizationById({ orgId });
      if (org?.name) orgName = org.name;
    } catch (_) {}

    const token2 = await getAdminToken();
    const candidates = [orgName, `org-${orgName}`, `org-${String(orgId)}`];
    
    for (const grpName of candidates) {
      try {
        const searchUrl = buildUrl(`/admin/realms/${REALM}/groups?search=${encodeURIComponent(grpName)}`);
        const r = await fetch(searchUrl, { headers: { Authorization: `Bearer ${token2}` } });
        const groups = await r.json().catch(() => []);
        const exact = Array.isArray(groups) ? groups.find(g => g.name === grpName) : null;
        
        if (exact?.id) {
          const putUrl = buildUrl(`/admin/realms/${REALM}/users/${encodeURIComponent(userId)}/groups/${encodeURIComponent(exact.id)}`);
          const gr = await fetch(putUrl, { method: 'PUT', headers: { Authorization: `Bearer ${token2}` } });
          
          if (gr.ok || gr.status === 201 || gr.status === 204) {
            console.log(`✅ Membership successful via group: ${grpName}`);
            return { ok: true, attempt: `group-join:${grpName}` };
          }
        }
      } catch (groupError) {
        console.log(`❌ Group attempt failed for ${grpName}:`, groupError.message);
      }
    }
  } catch (error) {
    console.log(`❌ Group fallback error:`, error.message);
    lastErrorText += `. Group fallback error: ${error.message}`;
  }

  throw new Error(`Add user to org failed. All attempts failed. Last error: ${lastErrorText}`);
}

export async function isUserInOrg({ orgId, userId }) {
  const token = await getAdminToken();
  // Prefer: GET members of org and check for userId presence
  const url = buildUrl(`/admin/realms/${REALM}/organizations/${encodeURIComponent(orgId)}/members`);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const txt = await res.text().catch(() => `${res.status}`);
    throw new Error(`Check user in org failed: ${res.status} ${txt}`);
  }
  const data = await res.json().catch(() => []);
  if (Array.isArray(data)) {
    return data.some((m) => String(m.id) === String(userId) || String(m.userId) === String(userId) || String(m.memberId) === String(userId));
  }
  return false;
}

export async function assignRealmRoles({ userId, roleNames = [] }) {
  if (!Array.isArray(roleNames) || roleNames.length === 0) return { ok: true };
  const token = await getAdminToken();

  // Fetch all realm roles, then map names to role reps
  const rolesRes = await fetch(buildUrl(`/admin/realms/${REALM}/roles`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const allRoles = await rolesRes.json();
  if (!rolesRes.ok) {
    throw new Error(`Fetch roles failed: ${rolesRes.status} ${JSON.stringify(allRoles)}`);
  }
  const selected = allRoles.filter((r) => roleNames.includes(r.name));

  const mapRes = await fetch(buildUrl(`/admin/realms/${REALM}/users/${encodeURIComponent(userId)}/role-mappings/realm`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(selected),
  });
  if (!mapRes.ok) {
    const txt = await mapRes.text();
    throw new Error(`Assign roles failed: ${mapRes.status} ${txt}`);
  }
  return { ok: true };
}

// Optional helpers for new-user flow. These endpoints may require Keycloak Organizations feature enabled.
export async function ensureUserExists({ userId, email, username, firstName, lastName }) {
  const token = await getAdminToken();
  
  // First check if user already exists
  const checkUrl = buildUrl(`/admin/realms/${REALM}/users/${encodeURIComponent(userId)}`);
  try {
    const checkRes = await fetch(checkUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (checkRes.ok) {
      console.log(`✅ User ${userId} already exists in Keycloak`);
      return true;
    }
  } catch (e) {
    console.log(`🔍 User check failed, will create: ${e.message}`);
  }
  
  // User doesn't exist, create them
  console.log(`📝 Creating user ${userId} in Keycloak...`);
  const createUrl = buildUrl(`/admin/realms/${REALM}/users`);
  
  const userPayload = {
    id: userId,
    username: username || email,
    email: email,
    firstName: firstName || "User",
    lastName: lastName || "Name",
    enabled: true,
    emailVerified: false
  };
  
  const createRes = await fetch(createUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(userPayload)
  });
  
  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Failed to create user in Keycloak: ${createRes.status} - ${errorText}`);
  }
  
  console.log(`✅ User ${userId} created successfully in Keycloak`);
  return true;
}

export async function createOrganizationForUser({ userId, name, email, username, firstName, lastName }) {
  const token = await getAdminToken();
  
  // Step 1: Ensure user exists in Keycloak before proceeding
  console.log(`🔍 Step 1: Ensuring user ${userId} exists in Keycloak...`);
  await ensureUserExists({ userId, email, username, firstName, lastName });
  
  // Step 2: Check if organization already exists, create if not
  console.log(`📋 Step 2: Checking if organization '${name}' already exists...`);
  let org = await getOrganizationByName({ name });
  
  if (org) {
    console.log(`✅ Organization '${name}' already exists with ID: ${org.id}`);
  } else {
    console.log(`📋 Step 2a: Creating organization '${name}' in Keycloak...`);
    const createUrl = buildUrl(`/admin/realms/${REALM}/organizations`);
    
    // Keycloak Organizations API now requires at least one domain
    // Try different domain formats in case one fails
    const domainAttempts = [
      { name: `${name}.local` },
      { name: `${name}.org` },
      { name: `${name}.com` },
      { name: name.replace(/[^a-zA-Z0-9]/g, '') + '.local' }
    ];
    
    let lastError = null;
    
    for (const domainFormat of domainAttempts) {
      try {
        const orgPayload = { 
          name,
          domains: [domainFormat]
        };
        
        console.log(`🔍 Trying organization creation with domain: ${domainFormat.name}`);
        
        const createRes = await fetch(createUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(orgPayload),
        });

        if (createRes.ok) {
          org = await createRes.json();
          console.log(`✅ Organization created with ID: ${org.id} using domain: ${domainFormat.name}`);
          break;
        } else {
          const errorText = await createRes.text();
          lastError = `Failed to create organization: ${createRes.status} - ${errorText}`;
          console.log(`❌ Domain attempt failed: ${domainFormat.name} - ${errorText}`);
        }
      } catch (error) {
        lastError = `Organization creation error: ${error.message}`;
        console.log(`❌ Domain attempt error: ${domainFormat.name} - ${error.message}`);
      }
    }
    
    if (!org) {
      throw new Error(lastError || 'All domain attempts failed for organization creation');
    }
  }

  // Step 3: Check if user is already in organization, add if not
  console.log(`👤 Step 3: Checking if user ${userId} is already in organization...`);
  const isAlreadyMember = await isUserInOrg({ orgId: org.id, userId });
  
  if (isAlreadyMember) {
    console.log(`✅ User ${userId} is already a member of organization '${name}'`);
  } else {
    console.log(`👤 Step 3a: Adding user ${userId} to organization as owner...`);
    await addUserToOrg({ orgId: org.id, userId, role: "owner" });
  }

  return org;
}

export async function createClientForOrg({ clientId, name }) {
  return await createKeycloakClient(clientId, name);
}

export async function createKeycloakClient(clientId, name = null) {
  try {
    const token = await getAdminToken();
    const clientSecret = `${clientId}-secret-${Date.now()}`;
    
    // Use the working reference implementation pattern
    const clientPayload = {
      clientId: clientId,
      enabled: true,
      protocol: 'openid-connect',
      secret: clientSecret,
      serviceAccountsEnabled: true,
      standardFlowEnabled: true,
      implicitFlowEnabled: false,
      directAccessGrantsEnabled: true,
      publicClient: false,
      redirectUris: ['*'],
      webOrigins: ['*']
    };

    console.log(`🔧 Creating Keycloak client '${clientId}' with payload:`, JSON.stringify(clientPayload, null, 2));

    const response = await fetch(
      `${BASE_URL}/admin/realms/${REALM}/clients`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientPayload)
      }
    );

    if (response.status === 201) {
      let clientUuid = null;
      if (response.headers.get('location')) {
        const locationParts = response.headers.get('location').split('/');
        clientUuid = locationParts[locationParts.length - 1];
      }

      console.log('✅ Keycloak client created successfully:', {
        clientId: clientId,
        clientUuid: clientUuid,
        name: name || clientId
      });

      return {
        id: clientUuid,
        clientId: clientId,
        name: name || clientId,
        clientSecret: clientSecret
      };
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to create Keycloak client:', {
        message: `Unexpected status code: ${response.status}`,
        response: errorText,
        status: response.status,
        clientId: clientId
      });
      throw new Error(`Unexpected status code: ${response.status} - ${errorText}`);
    }
  } catch (err) {
    console.error('❌ Failed to create Keycloak client:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
      clientId: clientId
    });
    throw err;
  }
}

/**
 * Create Keycloak client using the reference implementation pattern
 * This function follows the exact pattern from the reference code
 */
export async function createKeycloakClientWithReferencePattern(accessToken, clientId) {
  try {
    const response = await fetch(
      `${process.env.KEYCLOAK_SERVER_URL || BASE_URL}/admin/realms/${REALM}/clients`,
      {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${accessToken}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          clientId,
          protocol: "openid-connect",
          publicClient: false,
          serviceAccountsEnabled: true
        })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to create Keycloak client:", errorText);
      return null;
    }
    
    const data = await response.json();
    console.log(`✅ Keycloak client '${clientId}' created successfully using reference pattern`);
    return data;
  } catch (err) {
    console.error("Failed to create Keycloak client:", err.response?.data || err.message);
    return null;
  }
}

export async function getClientByClientId({ clientId }) {
  const token = await getAdminToken();
  const url = buildUrl(`/admin/realms/${REALM}/clients?clientId=${encodeURIComponent(clientId)}`);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => []);
  if (!res.ok) {
    throw new Error(`Get client by clientId failed: ${res.status} ${JSON.stringify(data)}`);
  }
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

export async function ensureClientRoles({ clientKeycloakId, roleNames = [] }) {
  if (!clientKeycloakId || !Array.isArray(roleNames) || roleNames.length === 0) return { ok: true };
  const token = await getAdminToken();
  const rolesUrl = buildUrl(`/admin/realms/${REALM}/clients/${encodeURIComponent(clientKeycloakId)}/roles`);
  const res = await fetch(rolesUrl, { headers: { Authorization: `Bearer ${token}` } });
  const existing = await res.json().catch(() => []);
  if (!res.ok) {
    throw new Error(`Fetch client roles failed: ${res.status} ${JSON.stringify(existing)}`);
  }
  const existingNames = new Set((existing || []).map((r) => r.name));
  for (const name of roleNames) {
    if (!existingNames.has(name)) {
      const cr = await fetch(rolesUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!cr.ok) {
        const txt = await cr.text();
        throw new Error(`Create client role '${name}' failed: ${cr.status} ${txt}`);
      }
    }
  }
  return { ok: true };
}

export async function assignClientRoles({ userId, clientKeycloakId, roleNames = [] }) {
  if (!userId || !clientKeycloakId || !Array.isArray(roleNames) || roleNames.length === 0) {
    console.log(`⚠️ assignClientRoles: Skipping - missing required params: userId=${!!userId}, clientKeycloakId=${!!clientKeycloakId}, roleNames=${roleNames.length}`);
    return { ok: true };
  }
  
  console.log(`🎭 assignClientRoles: Assigning roles ${roleNames.join(', ')} to user ${userId} in client ${clientKeycloakId}`);
  
  const token = await getAdminToken();
  
  // fetch roles to get full representations
  const rolesUrl = buildUrl(`/admin/realms/${REALM}/clients/${encodeURIComponent(clientKeycloakId)}/roles`);
  console.log(`🔍 Fetching client roles from: ${rolesUrl}`);
  
  const rr = await fetch(rolesUrl, { headers: { Authorization: `Bearer ${token}` } });
  const all = await rr.json().catch(() => []);
  
  if (!rr.ok) {
    console.log(`❌ Failed to fetch client roles: ${rr.status} - ${JSON.stringify(all)}`);
    throw new Error(`Fetch client roles failed: ${rr.status} ${JSON.stringify(all)}`);
  }
  
  console.log(`✅ Found ${all.length} client roles: ${all.map(r => r.name).join(', ')}`);
  
  const selected = all.filter((r) => roleNames.includes(r.name));
  console.log(`🎯 Selected roles to assign: ${selected.map(r => r.name).join(', ')} (${selected.length}/${roleNames.length})`);
  
  if (selected.length === 0) {
    console.log(`⚠️ No roles found to assign. Available roles: ${all.map(r => r.name).join(', ')}`);
    return { ok: true, message: 'No roles to assign' };
  }
  
  const mapUrl = buildUrl(`/admin/realms/${REALM}/users/${encodeURIComponent(userId)}/role-mappings/clients/${encodeURIComponent(clientKeycloakId)}`);
  console.log(`🔗 Assigning roles via: ${mapUrl}`);
  console.log(`📦 Role payload:`, JSON.stringify(selected, null, 2));
  
  const mapRes = await fetch(mapUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(selected),
  });
  
  if (!mapRes.ok) {
    const txt = await mapRes.text();
    console.log(`❌ Role assignment failed: ${mapRes.status} - ${txt}`);
    throw new Error(`Assign client roles failed: ${mapRes.status} ${txt}`);
  }
  
  console.log(`✅ Successfully assigned ${selected.length} roles to user ${userId}`);
  return { ok: true, assignedRoles: selected.length };
}

export async function getOrganizationById({ orgId }) {
  const token = await getAdminToken();
  const url = buildUrl(`/admin/realms/${REALM}/organizations/${encodeURIComponent(orgId)}`);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Get org by id failed: ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

export async function getUserIdByEmail({ email }) {
  const token = await getAdminToken();
  const url = buildUrl(`/admin/realms/${REALM}/users?email=${encodeURIComponent(email)}&exact=true`);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => []);
  if (!res.ok) throw new Error(`Find user by email failed: ${res.status} ${JSON.stringify(data)}`);
  const user = Array.isArray(data) ? data.find(u => (u.email || '').toLowerCase() === email.toLowerCase()) : null;
  return user?.id || null;
}

export async function getUserIdByUsername({ username }) {
  const token = await getAdminToken();
  const url = buildUrl(`/admin/realms/${REALM}/users?username=${encodeURIComponent(username)}&exact=true`);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => []);
  if (!res.ok) throw new Error(`Find user by username failed: ${res.status} ${JSON.stringify(data)}`);
  const user = Array.isArray(data) ? data.find(u => (u.username || '').toLowerCase() === username.toLowerCase()) : null;
  return user?.id || null;
}

export async function inviteExistingUserToOrg({ orgId, userId, email, username }) {
  const token = await getAdminToken();
  const url = buildUrl(`/admin/realms/${REALM}/organizations/${encodeURIComponent(orgId)}/members/invite-existing-user`);
  // Resolve userId if needed
  let resolvedUserId = userId;
  if (!resolvedUserId && email) {
    resolvedUserId = await getUserIdByEmail({ email }).catch(() => null);
  }
  if (!resolvedUserId && username) {
    resolvedUserId = await getUserIdByUsername({ username }).catch(() => null);
  }
  if (!resolvedUserId) {
    throw new Error(`Invite existing user failed: could not resolve user id from inputs`);
  }
  const bodies = [
    // form-encoded minimal
    { body: new URLSearchParams({ userId: resolvedUserId }), contentType: "application/x-www-form-urlencoded" },
    { body: new URLSearchParams({ id: resolvedUserId }), contentType: "application/x-www-form-urlencoded" },
    // json variants
    { body: { userId: resolvedUserId }, contentType: "application/json" },
    { body: { id: resolvedUserId }, contentType: "application/json" },
    { body: { memberId: resolvedUserId }, contentType: "application/json" },
    { body: { member: { id: resolvedUserId } }, contentType: "application/json" },
    { body: { users: [resolvedUserId] }, contentType: "application/json" },
    { body: [{ id: resolvedUserId }], contentType: "application/json" },
    // plain text
    { body: String(resolvedUserId), contentType: "text/plain" },
  ];
  let lastErr = "";
  for (const variant of bodies) {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": variant.contentType, Accept: "application/json" },
      body: variant.body instanceof URLSearchParams ? variant.body : JSON.stringify(variant.body),
    });
    if (res.ok) return { ok: true };
    lastErr = await res.text().catch(() => `${res.status}`);
  }
  throw new Error(`Invite existing user failed: ${lastErr}`);
}

export async function ensureOrgClientByOrgId({ orgId }) {
  // Resolve KC org and derive candidate clientIds; create if not found
  let orgName = String(orgId);
  try {
    const org = await getOrganizationById({ orgId });
    if (org?.name) orgName = org.name;
  } catch (_) {}

  // Prefer client-{baseName}
  const baseName = orgName.startsWith("org-") ? orgName.slice(4) : orgName;
  const candidates = [
    `client-${baseName}`,
    `${orgName}-client`,
    orgName.startsWith("org-") ? `${orgName}-client` : `org-${orgName}-client`,
    `org-${String(orgId)}-client`,
    `${String(orgId)}-client`,
  ];

  for (const cid of candidates) {
    const existing = await getClientByClientId({ clientId: cid }).catch(() => null);
    if (existing) return existing;
  }

  // Create with primary candidate
  const newClientId = candidates[0];
  await createClientForOrg({ clientId: newClientId, name: newClientId });
  const created = await getClientByClientId({ clientId: newClientId });
  return created;
}

export async function ensureUserOrg({ userId, preferredUsername, email }) {
  const usernamePart = (preferredUsername || email || userId).split("@")[0];
  const orgName = `org-${usernamePart}`;
  let org = await getOrganizationByName({ name: orgName }).catch(() => null);
  if (!org) {
    org = await createOrganizationForUser({ 
      userId, 
      name: orgName,
      email: email,
      username: preferredUsername || email,
      firstName: (preferredUsername || email || userId).split('@')[0] || 'User',
      lastName: 'Name'
    });
  }
  try {
    await addUserToOrg({ orgId: org.id || org._id || org.orgId, userId, role: "owner" });
  } catch (_) {
    // best effort; membership may already exist
  }
  return org;
}

export async function getOrganizationUsers({ orgId }) {
  const token = await getAdminToken();
  const url = buildUrl(`/admin/realms/${REALM}/organizations/${encodeURIComponent(orgId)}/users`);
  const res = await fetch(url, { 
    headers: { 
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    } 
  });
  
  if (!res.ok) {
    const txt = await res.text().catch(() => `${res.status}`);
    throw new Error(`Get organization users failed: ${res.status} ${txt}`);
  }
  
  const data = await res.json().catch(() => []);
  return Array.isArray(data) ? data : [];
}

export async function assignUserToOrganization({ orgId, userId, role = "member" }) {
  const token = await getAdminToken();
  
  // Method 1: Try the direct assignment endpoint
  const assignUrl = buildUrl(`/admin/realms/${REALM}/organizations/${encodeURIComponent(orgId)}/users`);
  const assignPayload = { userId, role };
  
  try {
    const res = await fetch(assignUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(assignPayload)
    });
    
    if (res.ok || res.status === 201 || res.status === 204) {
      return { success: true, method: "direct-assignment" };
    }
  } catch (error) {
    // Continue to fallback methods
  }
  
  // Method 2: Use the existing robust addUserToOrg function as fallback
  try {
    const result = await addUserToOrg({ orgId, userId, role });
    return { success: true, method: "fallback-addUserToOrg", result };
  } catch (error) {
    throw new Error(`Failed to assign user to organization: ${error.message}`);
  }
}

export async function getUserById({ userId }) {
  console.log(`🔍 getUserById called with userId: ${userId}`);
  const token = await getAdminToken();
  console.log(`🔍 Got admin token: ${token ? 'Yes' : 'No'}`);
  
  const url = buildUrl(`/admin/realms/${REALM}/users/${encodeURIComponent(userId)}`);
  console.log(`🔍 Calling Keycloak API: ${url}`);
  
  try {
    const res = await fetch(url, { 
      headers: { 
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      } 
    });
    
    console.log(`🔍 Keycloak API response status: ${res.status}`);
    
    if (!res.ok) {
      if (res.status === 404) {
        console.log(`🔍 User ${userId} not found in Keycloak`);
        return null; // User not found
      }
      const errorText = await res.text().catch(() => 'No error text');
      console.log(`🔍 Keycloak API error response: ${errorText}`);
      throw new Error(`Failed to get user: ${res.status} - ${errorText}`);
    }
    
    const userData = await res.json();
    console.log(`🔍 Keycloak API response data:`, userData);
    
    const result = {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      displayName: userData.firstName && userData.lastName 
        ? `${userData.firstName} ${userData.lastName}`.trim()
        : userData.username || userData.email || 'Unknown User'
    };
    
    console.log(`🔍 Processed user result:`, result);
    return result;
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error.message);
    return null;
  }
}


