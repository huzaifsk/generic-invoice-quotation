function pickUserSafe(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    createdAt: user.createdAt,
  };
}

module.exports = { pickUserSafe };
