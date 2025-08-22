// server/models/MediaAccess.js
import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const MediaAccess = sequelize.define(
	"MediaAccess",
	{
		mediaId: { type: DataTypes.INTEGER, allowNull: false },
		userId: { type: DataTypes.STRING, allowNull: false }, // Keycloak sub
		role: { type: DataTypes.ENUM("reviewer", "viewer"), allowNull: false },
	},
	{
		tableName: "media_access",
		timestamps: true,
		indexes: [{ unique: true, fields: ["mediaId", "userId"] }],
	}
);

export default MediaAccess;


