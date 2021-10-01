//function to find if user exists
const findUserByEmail = (email, database) => {
  for (const userID in database) {
    const idOfUser = database[userID];
    if (idOfUser.email === email) {
      return idOfUser;
    }
  }
  return null;
};

module.exports = { findUserByEmail };