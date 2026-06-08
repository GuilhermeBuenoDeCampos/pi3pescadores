module.exports = (sequelize, DataTypes) => {
  const AuditoriaProduto = sequelize.define(
    'AuditoriaProduto',
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      product_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: 'produto',
          key: 'id',
        },
      },
      quantidade_sistema: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      quantidade_fisica: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      usuario_id: {
        type: DataTypes.STRING(36),
        allowNull: true,
      },
      observacoes: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'auditoria_produto',
      timestamps: false,
    }
  );

  AuditoriaProduto.associate = (models) => {
    AuditoriaProduto.belongsTo(models.Produto, {
      foreignKey: 'product_id',
      as: 'produto',
    });
  };

  return AuditoriaProduto;
};
