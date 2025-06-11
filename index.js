require("dotenv").config();

const axios = require("axios");
const fs = require("fs");
const cheerio = require("cheerio");
const tough = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");

// API URLs
const LOGIN_URL = `${process.env.BASE_URL}/login`;
const USERS_URL = `${process.env.BASE_URL}/api/users`;
const TOKEN_URL = `${process.env.BASE_URL}/settings/tokens`;
const SETTINGS_URL = `${process.env.API_URL}/api/settings`;

// Login credentials
const LOGIN_CREDENTIALS = {
  username: process.env.USERNAME,
  password: process.env.PASSWORD,
};

// STEP:1 To automate cookie management creating a new axios instance
const createAxiosClient = () => {
  const jar = new tough.CookieJar();
  const client = wrapper(axios.create({ jar: jar, withCredentials: true }));
  return client;
};

//STEP:2 Login to the website
const getNonce = async (client) => {
  try {
    const loginPage = await client.get(LOGIN_URL);
    const $ = cheerio.load(loginPage.data);
    const nonce = $('input[name="nonce"]').val();
    console.log("✅ Nonce fetched successfully");
    return nonce;
  } catch (error) {
    console.log("❌ Error getting nonce:", error.message);
  }
};

const login = async (client, nonce) => {
  try {
    await client.post(
      LOGIN_URL,
      new URLSearchParams({
        nonce,
        username: LOGIN_CREDENTIALS.username,
        password: LOGIN_CREDENTIALS.password,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("✅ Login Successful");
  } catch (error) {
    console.log(
      `❌Login failed::${error.response.status}: ${error.response.message}`
    );
  }
};

// Main function to run the script
const main = async () => {
  try {
    const client = createAxiosClient();
    const nonce = await getNonce(client);
    if (nonce) {
      await login(client, nonce);
      const usersRes = await client.post(USERS_URL, null);
      console.log("✅Fetched user list", usersRes.data);
    }
  } catch (error) {
    if (error.response) {
      console.log(
        `❌ ERROR ${error.response.status} :: ${error.response.message}`
      );
    } else {
      console.log("❌ ERROR ::", error.message);
    }
  }
};

main();
