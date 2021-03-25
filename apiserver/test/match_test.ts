import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.90.0/testing/asserts.ts";
import { v4 } from "https://deno.land/std@0.89.0/uuid/mod.ts";

import ApiClient from "../api_client.js";
const ac = new ApiClient();

import { errors } from "../error.ts";

const assertMatch = (match: any, sample: any = {}) => {
  const match_ = Object.assign({}, match);
  const sample_ = Object.assign({}, sample);

  assert(v4.validate(match_.userId));
  if (sample_.userId) assertEquals(match_.userId, sample_.userId);
  assertEquals(match_.spec, sample_.spec || "");
  assert(v4.validate(match_.accessToken));
  assert(v4.validate(match_.gameId));
  if (sample_.gameId) assertEquals(match_.gameId, sample_.gameId);
  assertEquals(typeof match_.index, "number");
  if (sample_.index) assertEquals(match_.index, sample_.index);
};

const assertGame = (game: any, sample: any = {}) => {
  const game_ = Object.assign({}, game);
  const sample_ = Object.assign({}, sample);
  assert(v4.validate(game_.gameId));
  if (sample_.gameId) assertEquals(game_.gameId, sample_.gameId);
  assertEquals(game_.gaming, sample_.gaming || false);
  assertEquals(game_.ending, sample_.ending || false);
  assertEquals(game_.board, sample_.board || null);
  if (game_.board) assertBoard(game_.board);
  assertEquals(game_.turn, sample_.turn || 0);
  assertEquals(game_.tiled, sample_.tiled || null);
  assert(Array.isArray(game_.players));
  assert(Array.isArray(game_.log));
  assertEquals(game_.gameName, sample_.name || "");
  assertEquals(game_.startedAtUnixTime, null);
  assertEquals(game_.nextTurnUnixTime, null);
  assert(Array.isArray(game_.reservedUsers));
  if (sample_.reservedUsers) assert(game_.reservedUsers, sample_.reservedUsers);
};

const assertBoard = (board: any) => {
  assertEquals(typeof board.name, "string");
  assertEquals(typeof board.width, "number");
  assertEquals(typeof board.height, "number");
  assertEquals(typeof board.nTurn, "number");
  assertEquals(typeof board.nAgent, "number");
  assertEquals(typeof board.nSec, "number");
  assert(Array.isArray(board.points));
};

const assertAction = (actionRes: any) => {
  assertEquals(typeof actionRes.receptionUnixTime, "number");
  assertEquals(typeof actionRes.turn, "number");
};

// /api/match Test
// テスト項目
// ユーザ識別子無効、パスワード無効、ユーザ無し
// gameID有：ゲーム無し
// useAi：AI無し
Deno.test("api/match:invalid id or name", async () => {
  const data = { option: { dryRun: true } };
  const res = await ac.match(data);
  assertEquals(res, errors.INVALID_USER_IDENTIFIER);
});
Deno.test("api/match:nothing password", async () => {
  const uuid = v4.generate();
  const userData: any = { screenName: uuid, name: uuid, password: uuid };
  const userRes = await ac.usersRegist(userData);
  userData.id = userRes.id;

  const data = { id: userData.id, option: { dryRun: true } };
  const res = await ac.match(data);

  await ac.usersDelete(userData);
  assertEquals(res, errors.NOTHING_PASSWORD);
});
Deno.test("api/match:can not find user", async () => {
  const data = { id: v4.generate(), password: "pw", option: { dryRun: true } };
  const res = await ac.match(data);
  assertEquals(res, errors.NOT_USER);
});
Deno.test("api/match:can not find game", async () => {
  const uuid = v4.generate();
  const userData: any = { screenName: uuid, name: uuid, password: uuid };
  const userRes = await ac.usersRegist(userData);
  userData.id = userRes.id;

  const data = {
    id: userData.id,
    password: userData.password,
    gameId: v4.generate(),
    option: { dryRun: true },
  };
  const res = await ac.match(data);
  await ac.usersDelete(userData);
  assertEquals(res, errors.NOT_GAME);
});
Deno.test("api/match:can not find ai", async () => {
  const uuid = v4.generate();
  const userData: any = { screenName: uuid, name: uuid, password: uuid };
  const userRes = await ac.usersRegist(userData);
  userData.id = userRes.id;

  const data = {
    id: userData.id,
    password: userData.password,
    useAi: true,
    aiOption: {
      aiName: "",
    },
    option: { dryRun: true },
  };
  const res = await ac.match(data);
  await ac.usersDelete(userData);
  assertEquals(res, errors.NOT_AI);
});
Deno.test("api/match:normal", async () => {
  const uuid = v4.generate();
  const userData: any = { screenName: uuid, name: uuid, password: uuid };
  const userRes = await ac.usersRegist(userData);
  userData.id = userRes.id;

  const data = {
    id: userData.id,
    password: userData.password,
  };
  const res = await ac.match(data);
  await ac.usersDelete(userData);

  assertMatch(res, { userId: userData.id });
});
Deno.test("api/match:normal by selfGame", async () => {
  const uuid = v4.generate();
  const userData: any = { screenName: uuid, name: uuid, password: uuid };
  const userRes = await ac.usersRegist(userData);
  userData.id = userRes.id;

  const gameData = { name: "テスト", boardName: "A-1" };
  const gameRes = await ac.gameCreate(gameData);

  const data = {
    id: userData.id,
    password: userData.password,
    gameId: gameRes.gameId,
  };
  const res = await ac.match(data);
  await ac.usersDelete(userData);

  assertMatch(res, { userId: userData.id, gameId: gameRes.gameId });
});
Deno.test("api/match:normal by useAi", async () => {
  const uuid = v4.generate();
  const userData: any = { screenName: uuid, name: uuid, password: uuid };
  const userRes = await ac.usersRegist(userData);
  userData.id = userRes.id;

  const data = {
    id: userData.id,
    password: userData.password,
    useAi: true,
    aiOption: {
      aiName: "a1",
    },
  };
  const res = await ac.match(data);
  await ac.usersDelete(userData);
  assertMatch(res, { userId: userData.id });
});

// /api/match/(gameId) Test
// テスト項目
// 正常、ゲーム無し
Deno.test("api/match/(gameId):normal", async () => {
  const gameData = { name: "テスト", boardName: "A-1" };
  const gameRes = await ac.gameCreate(gameData);

  const res = await ac.getMatch(gameRes.gameId);

  assertGame(res, { gameId: gameRes.gameId, name: gameData.name });
});
Deno.test("api/match/(gameId):not find game", async () => {
  const res = await ac.getMatch(v4.generate());

  assertEquals(res, errors.NOT_GAME);
});

// /api/match/(gameId)/action Test
// テスト項目
// 正常、アクセストークン無効
Deno.test("api/match/(gameId)/action:normal", async () => {
  const uuid = v4.generate();
  const userData: any = { screenName: uuid, name: uuid, password: uuid };
  const userRes = await ac.usersRegist(userData);
  userData.id = userRes.id;

  const data = {
    id: userData.id,
    password: userData.password,
    useAi: true,
    aiOption: {
      aiName: "a1",
    },
  };
  const matchRes = await ac.match(data);

  const actionData = {
    actions: [
      { agentId: 0, type: "PUT", x: 0, y: 0 },
    ],
  };
  const res = await ac.setAction(
    matchRes.gameId,
    actionData,
    matchRes.accessToken,
  );
  await ac.usersDelete(userData);

  assertAction(res);
});
Deno.test("api/match/(gameId)/action:invalid accessToken", async () => {
  const uuid = v4.generate();
  const userData: any = { screenName: uuid, name: uuid, password: uuid };
  const userRes = await ac.usersRegist(userData);
  userData.id = userRes.id;

  const data = {
    id: userData.id,
    password: userData.password,
    useAi: true,
    aiOption: {
      aiName: "a1",
    },
  };
  const matchRes = await ac.match(data);

  const actionData = {
    actions: [
      { agentId: 0, type: "PUT", x: 0, y: 0 },
    ],
  };
  const res = await ac.setAction(
    matchRes.gameId,
    actionData,
  );
  await ac.usersDelete(userData);

  assertEquals(res, errors.INVALID_ACCESSTOKEN);
});
