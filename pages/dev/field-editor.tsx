/// <reference lib="dom"/>
import React, { useEffect, useState } from "react";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import { Link, Redirect, RouteComponentProps } from "react-router-dom";
import TextField from "@material-ui/core/TextField";
import MenuItem from "@material-ui/core/MenuItem";

import Content from "../../components/content.tsx";
import GameBoard from "../../components/gameBoard.tsx";

import ApiClient from "../../apiserver/api_client.js";
const apiClient = new ApiClient("");

const useStyles = makeStyles((theme) =>
  createStyles({
    content: {
      display: "flex",
      alignItems: "center",
      flexDirection: "column",
    },
    pieGraph: {
      height: 300,
    },
  })
);

export default function () {
  const classes = useStyles();
  const [boards, setBoards] = useState<any[]>();
  const [board, setBoard] = useState<any[]>();
  const [game, setGame] = useState<any>();
  const gameF = React.useRef(game);

  useEffect(() => {
    getBoards();
  }, []);

  async function getBoards() {
    const boards_ = await apiClient.getBoards();
    console.log(boards_);
    setBoards(boards_);
  }

  const handleChange = (
    event: React.ChangeEvent<{ value: unknown }>,
  ) => {
    const value = event.target.value;
    if (!boards) return;
    const board = boards.find((b) => b.name === value);
    setBoard(board);
    const tiled = new Array(board.height * board.width);
    for (let i = 0; i < tiled.length; i++) {
      tiled[i] = [0, -1];
    }
    const game = {
      board,
      tiled,
      players: [{ agents: [] }, { agents: [] }],
    };
    setGame(game);
  };
  const mouseDown = (e: MouseEvent, i: number, x: number, y: number) => {
    const tiled = [...gameF.current.tiled];
    const players = [...gameF.current.players];

    const isAgent = (x: number, y: number) => {
      if (gameF.current.players) {
        const agent = (gameF.current.players as any[]).map((e: any, i) =>
          (e.agents as any[]).map((e_, j) => {
            return { agent: e_, player: i, n: j };
          })
        ).flat().find((e) => e.agent.x === x && e.agent.y === y);
        return agent;
      } else return undefined;
    };

    switch (e.button) {
      case 0: {
        let t = tiled[i];
        let a = (t[0] * 2 + t[1]) + 1;
        a = (a + 1) % 5;
        t = [Math.trunc((a - 1) / 2), (a - 1) % 2];
        tiled[i] = t;

        const agent = isAgent(x, y);
        if (agent) {
          players[agent.player].agents.splice(agent.n, 1);
        }
        break;
      }
      case 2: {
        let t = tiled[i];
        if (t[0] === 1) {
          const a = isAgent(x, y);
          if (a) players[a.player].agents.splice(a.n, 1);
          else players[t[1]].agents.push({ x, y });
        }
        break;
      }
    }
    setGame({ ...gameF.current, tiled, players });
  };

  useEffect(() => {
    const table = document.querySelector("#game-board #field");
    if (!table) return;
    const board = game.board;
    const tds = table.getElementsByTagName("td");

    for (let i = 0; i < tds.length; i++) {
      const [x, y] = [i % board.height, Math.floor(i / board.width)];
      const td = tds[i];
      td.oncontextmenu = () => false;
      td.onmousedown = (e) => {
        mouseDown(e, i, x, y);
      };
    }
  }, [board]);

  return (
    <Content title="フィールド説明用エディタ">
      <div className={classes.content}>
        <TextField
          select
          label="使用ボード"
          variant="standard"
          color="secondary"
          autoComplete="off"
          style={{ width: "20em" }}
          onChange={handleChange}
        >
          {boards?.map((board) => {
            return <MenuItem value={board.name}>{board.name}</MenuItem>;
          })}
        </TextField>
        {game && <div id="game-board">
          <GameBoard game={game} />
        </div>}
      </div>
    </Content>
  );
}
