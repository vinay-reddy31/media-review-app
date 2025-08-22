// server/utils/accessControl.js
import Media from "../models/Media.js";
import MediaAccess from "../models/MediaAccess.js";

export async function getUserEffectiveRoleForMedia(user, mediaId) {
	const numericId = Number(mediaId);
	const media = await Media.findByPk(Number.isNaN(numericId) ? mediaId : numericId);
	if (!media) return { role: null, media: null };

	if (String(media.ownerId) === String(user.sub)) {
		return { role: "owner", media };
	}

	const access = await MediaAccess.findOne({ where: { mediaId: media.id, userId: user.sub } });
	if (access) {
		return { role: access.role, media };
	}

	return { role: null, media };
}

export function hasCapability(role, capability) {
	if (!role) return false;
	if (capability === "delete" || capability === "edit") return role === "owner";
	if (capability === "annotate") return role === "owner" || role === "reviewer";
	if (capability === "view") return role === "owner" || role === "reviewer" || role === "viewer";
	return false;
}


