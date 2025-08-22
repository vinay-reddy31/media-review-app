// server/models/ShareLink.js
import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const ShareLink = sequelize.define(
	"ShareLink",
	{
		mediaId: { type: DataTypes.INTEGER, allowNull: false },
		grantedRole: { type: DataTypes.ENUM("reviewer", "viewer"), allowNull: false },
		token: { type: DataTypes.STRING, allowNull: false, unique: true },
		createdBy: { type: DataTypes.STRING, allowNull: false }, // owner keycloak sub
		expiresAt: { type: DataTypes.DATE, allowNull: true },
		maxUses: { type: DataTypes.INTEGER, allowNull: true },
		uses: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
		inviteeEmail: { type: DataTypes.STRING, allowNull: true },
		shareType: { type: DataTypes.ENUM("public", "email"), allowNull: false, defaultValue: "email" },
	},
	{
		tableName: "share_links",
		timestamps: true,
	}
);

export default ShareLink;


