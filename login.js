const {OAuth2Client} = require('google-auth-library');
const client = new OAuth2Client();
async function verify() {
  const ticket = await client.verifyIdToken({
      idToken: "e3zzjng6mFacV4LMXsffVBOk3Or1",
      audience: "852150473756-hk4sprponve66g8lslmdnspi4bqbcfbh.apps.googleusercontent.com",  // Specify the CLIENT_ID of the app that accesses the backend
      // Or, if multiple clients access the backend:
      //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
  });
  const payload = ticket.getPayload();
  const userid = payload['sub'];
  // If the request specified a Google Workspace domain:
  // const domain = payload['hd'];
}
verify().catch(console.error);