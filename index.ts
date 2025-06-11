import axios, { AxiosInstance } from "axios";
import * as fs from "fs";
import * as crypto from "crypto";
import * as cheerio from "cheerio";
import * as dotenv from "dotenv";
import * as tough from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";

dotenv.config();

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

interface Tokens {
  access_token: string;
  openId: string;
  userId: string;
  apiuser: string;
  operateId: string;
  language: string;
}

// STEP:1 To automate cookie management creating a new axios instance
const createAxiosClient = (): AxiosInstance => {
  const jar = new tough.CookieJar();
  const client = wrapper(axios.create({ jar: jar, withCredentials: true }));
  return client;
};

//STEP:2 Login to the website
const getNonce = async (client: AxiosInstance): Promise<string | null> => {
  try {
    const loginPage = await client.get(LOGIN_URL);
    const $ = cheerio.load(loginPage.data);
    const nonce = $('input[name="nonce"]').val();
    console.log("✅ Nonce fetched successfully");
    return typeof nonce === "string" ? nonce : null;
  } catch (error: any) {
    console.log("❌ Error getting nonce:", error.message);
    return null;
  }
};

const login = async (client: AxiosInstance, nonce: string) => {
  try {
    await client.post(
      LOGIN_URL,
      new URLSearchParams({
        nonce,
        username: LOGIN_CREDENTIALS.username || "",
        password: LOGIN_CREDENTIALS.password || "",
      }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );
    console.log("✅ Login Successful");
  } catch (error: any) {
    console.log(
      `❌ Login failed :: ${error.response?.status} : ${error.response?.message}`
    );
  }
};

//STEP:3 Get the current user data using settings
const getTokens = async (client: AxiosInstance): Promise<Tokens | null> => {
  try {
    const tokensPage = await client.get(TOKEN_URL);
    const $ = cheerio.load(tokensPage.data);

    const tokens: Tokens = {
      access_token: String($("#access_token").val() || ""),
      openId: String($("#openId").val() || ""),
      userId: String($("#userId").val() || ""),
      apiuser: String($("#apiuser").val() || ""),
      operateId: String($("#operateId").val() || ""),
      language: String($("#language").val() || ""),
    };

    console.log("✅ Tokens fetched successfully");
    return tokens;
  } catch (error) {
    console.log("❌ Error getting tokens");
    return null;
  }
};

const createCheckcode = (
  data: Record<string, string>,
  secret = "mys3cr3t"
): { timestamp: string; checkcode: string } => {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = { ...data, timestamp };

  const queryString = Object.keys(payload)
    .sort()
    .map(
      (key) =>
        `${key}=${encodeURIComponent(payload[key as keyof typeof payload])}`
    )
    .join("&");

  const hmac = crypto.createHmac("sha1", secret);
  hmac.update(queryString);
  const checkcode = hmac.digest("hex").toUpperCase();

  return { timestamp, checkcode };
};

const getCurrentUser = async (
  client: AxiosInstance,
  tokens: Tokens
): Promise<any | null> => {
  try {
    const tokenRecord: Record<string, string> = {
      access_token: tokens.access_token,
      openId: tokens.openId,
      userId: tokens.userId,
      apiuser: tokens.apiuser,
      operateId: tokens.operateId,
      language: tokens.language,
    };
    const { timestamp, checkcode } = createCheckcode(tokenRecord);
    const res = await client.post(
      SETTINGS_URL,
      new URLSearchParams({
        ...tokenRecord,
        timestamp,
        checkcode,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );
    console.log("✅ Current user fetched successfully");
    return res;
  } catch (error) {
    console.log("❌ Error getting current user");
    return null;
  }
};

//STEP:4 Function to write the data to a file
const writeDataToFile = (data: any) => {
  fs.writeFileSync("users.json", JSON.stringify(data, null, 2));
};

// Main function to run the script
const main = async () => {
  try {
    const client = createAxiosClient();
    const nonce = await getNonce(client);
    if (nonce) {
      await login(client, nonce);
      const usersRes = await client.post(USERS_URL, null);
      const tokens = await getTokens(client);
      if (!tokens) return;
      const currentUser = await getCurrentUser(client, tokens);
      if (!currentUser) return;
      const combinedData = {
        users: usersRes.data,
        currentUser: currentUser.data,
      };
      writeDataToFile(combinedData);
      console.log("✅ User file created successfully");
    }
  } catch (error: any) {
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
