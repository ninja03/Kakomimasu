/// <reference lib="dom"/>
import React, { useEffect, useState } from "react";
import {
  Button,
  CircularProgress,
  createStyles,
  makeStyles,
  TextField,
} from "@material-ui/core";
import {
  Cell,
  Pie,
  PieChart,
  PieLabel,
  ResponsiveContainer,
} from "https://cdn.esm.sh/recharts";

import firebase from "../../components/firebase.ts";
import { Link, Redirect, RouteComponentProps } from "react-router-dom";
import Section, { SubSection } from "../../components/section.tsx";
import Content from "../../components/content.tsx";
import GameList from "../../components/gamelist.tsx";

import ApiClient from "../../apiserver/api_client.js";
const apiClient = new ApiClient("");

interface User {
  screenName: string;
  name: string;
  id: string;
  gamesId: string[];
}
interface ExpUser extends User {
  games: any[];
  pieData: any[];
}

type Props = {
  children?: React.ReactNode;
  firebase: typeof firebase;
} & RouteComponentProps<{ id: string }>;

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

export default function (props: Props) {
  console.log("detail", props.match.params.id);
  const classes = useStyles();

  const [user, setUser] = useState<ExpUser | undefined | null>(undefined);

  const getUser = async () => {
    const res = await apiClient.usersShow(props.match.params.id) as User;
    console.log(res);
    if (res.hasOwnProperty("errorCode")) {
      setUser(null);
    } else {
      const games: any[] = [];
      for (const gameId of res.gamesId) {
        const game = await apiClient.getMatch(gameId);
        games.push(game);
      }
      const result = [0, 0, 0]; // 勝ち、負け、引き分け
      games.forEach((g) => {
        console.log(g);
        if (g.ending === false) return;
        const players = g.players.map((p: any) => {
          return {
            id: p.id,
            point: p.point.wallpoint + p.point.basepoint,
          };
        });
        players.sort((a: any, b: any) => a.point - b.point);

        if (players[0].id === res.id) {
          if (players[0].point === players[players.length - 1].point) {
            result[2]++;
          } else result[1]++;
        }
        if (players[players.length - 1].id === res.id) {
          result[0]++;
        }
        console.log(result);
      });

      const pieData = [
        { name: "Win", value: result[0] },
        { name: "Lose", value: result[1] },
        { name: "Even", value: result[2] },
      ];
      console.log(result, pieData);

      console.log({ ...res, games, pieData });
      setUser({ ...res, games, pieData });
    }
  };

  useEffect(() => {
    getUser();
  }, [props.match.params.id]);

  const renderLabel: PieLabel = (
    { cx, cy, midAngle, innerRadius, outerRadius, percent, index },
  ) => {
    if (percent === 0) return (<></>);
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Content title="ユーザ詳細">
      <div className={classes.content}>
        {user === undefined ? <CircularProgress color="secondary" /> : <>
          {user
            ? <>
              <Section title="基本情報">
                <div className={classes.content}>
                  <SubSection title="表示名">{user.screenName}</SubSection>
                  <SubSection title="ユーザネーム">{user.name}</SubSection>
                  <SubSection title="ユーザID">{user.id}</SubSection>
                </div>
              </Section>
              <Section title="勝敗記録">
                <div className={classes.pieGraph}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={user.pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        fill="#8884d8"
                        label={renderLabel}
                        labelLine={false}
                      >
                        <Cell fill="#D92546" />
                        <Cell fill="#A7D4D9" />
                        <Cell fill="#F2BB9B" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Section>
              <Section title="参加ゲーム一覧">
                <GameList games={user.games} />
              </Section>
            </>
            : <div className={classes.content}>
              <div>ユーザが存在しません</div>
              <Link to="/">囲みマス トップページへ</Link>
            </div>}
        </>}
      </div>
    </Content>
  );
}
