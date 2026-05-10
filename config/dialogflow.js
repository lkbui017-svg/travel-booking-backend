require('dotenv').config();

module.exports = {
  projectId: process.env.DIALOGFLOW_PROJECT_ID,
  privateKey: process.env.DIALOGFLOW_PRIVATE_KEY,
  clientEmail: process.env.DIALOGFLOW_CLIENT_EMAIL,
};
