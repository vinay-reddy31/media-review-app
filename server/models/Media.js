// server/models/Media.js
import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const Media = sequelize.define(
  "Media",
  {
    title: { type: DataTypes.STRING, allowNull: false },
    filePath: { type: DataTypes.STRING, allowNull: false }, // served from /uploads or S3 url
    thumbnailPath: { type: DataTypes.STRING, allowNull: true },
    type: { type: DataTypes.ENUM("image", "video"), allowNull: false },
    ownerId: { type: DataTypes.STRING, allowNull: false }, // store Keycloak sub (string)
  },
  {
    tableName: "media",
    timestamps: true,
  }
);

export default Media;
