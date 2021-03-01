// だいたい点数の高い順に置き、点数の高い順に壊しながら動くアルゴリズム
#include "kakomimasu.h"

struct Tile_info {
    int x, y;
    int type, pid;
    int point;

    // ポイントが高い順にソートできるように比較演算子の定義
    bool operator<(const Tile_info &right) const {
        return point < right.point;
    }
};

int main() {
    KakomimasuClient kc("ai-4", "AI-4", "破壊者", "ai-4-pw");
    kc.waitMatching();
    kc.getGameInfo();

    const int pno = kc.getPlayerNumber();
    const vector<vector<int>> points = kc.getPoints();
    const int w = kc.getWidth();
    const int h = kc.getHeight();
    const int nagents = kc.getAgentCount();

    // ポイントの高い順ソート
    // point, x, y
    vector<tuple<int, int, int>> pntall;
    for (int i = 0; i < h; i++) {
        for (int j = 0; j < w; j++) {
            pntall.emplace_back(points[i][j], j, i);
        }
    }
    sort(pntall.rbegin(), pntall.rend());

    // ↓ここからがAIの中身↓
    while (kc.getGameInfo()) {
        vector<Action> actions;
        vector<vector<Tile>> field = kc.getFiled();
        int offset = rnd(nagents);
        vector<tuple<int, int>> poschk; // 動く予定の場所

        auto checkFree = [&](int x, int y) -> bool {
            for (int i = 0; i < poschk.size(); i++) {
                auto [px, py] = poschk[i];
                if (px == x && py == y)
                    return false;
            }
            return true;
        };

        for (int i = 0; i < nagents; i++) {
            Agent agent = kc.getAgent()[i];
            if (agent.x == -1) { // 置く前
                auto [p_point, p_x, p_y] = pntall[i + offset];
                actions.push_back({i, "PUT", p_x, p_y});
            } else {
                vector<Tile_info> dirall;
                for (auto [dx, dy] : DIR) {
                    int x = agent.x + dx;
                    int y = agent.y + dy;
                    if (x >= 0 && x < w && y >= 0 && y < h && checkFree(x, y)) {
                        Tile f = field[y][x];
                        if (f.type == 0 && f.pid != -1 && f.pid != pno && f.point > 0) { // 敵土地
                            dirall.push_back({x, y, f.type, f.pid, f.point + 10});
                        } else if (f.type == 0 && f.pid == -1 && f.point > 0) { // 空き土地
                            dirall.push_back({x, y, f.type, f.pid, f.point + 5});
                        } else if (f.type == 1 && f.pid != pno) { // 敵壁
                            dirall.push_back({x, y, f.type, f.pid, f.point});
                        }
                    }
                }
                if (dirall.size() > 0) {
                    sort(dirall.rbegin(), dirall.rend());
                    Tile_info p = dirall[0];
                    if (p.type == 0 || p.pid == -1) {
                        actions.push_back({i, "MOVE", p.x, p.y});
                        poschk.push_back({p.x, p.y});
                    } else {
                        actions.push_back({i, "REMOVE", p.x, p.y});
                    }
                    poschk.push_back({agent.x, agent.y});
                } else {
                    // 周りが全部埋まっていたら空いている高得点で一番近いところを目指す
                    cout << "kitaaaa" << endl;
                    int dis = w * h;
                    tuple<int, int, int> target;
                    bool target_flag = false;
                    for (auto p : pntall) {
                        auto [p_point, p_x, p_y] = p;
                        if (field[p_y][p_x].type == 0 && field[p_y][p_x].pid == -1) {
                            int dx = agent.x - p_x;
                            int dy = agent.y - p_y;
                            int d = dx * dx + dy * dy;
                            if (d < dis) {
                                dis = d;
                                target = p;
                                target_flag = true;
                            }
                        }
                    }
                    if (target_flag) {
                        auto sgn = [&](int n) -> int {
                            if (n < 0) return -1;
                            if (n > 0) return 1;
                            return 0;
                        };
                        auto [target_point, target_x, target_y] = target;
                        int x2 = agent.x + sgn(target_x - agent.x);
                        int y2 = agent.y + sgn(target_y - agent.y);
                        Tile p = field[y2][x2];
                        if (p.type == 0 || p.pid == -1) {
                            actions.push_back({i, "MOVE", x2, y2});
                            poschk.push_back({x2, y2});
                        } else {
                            actions.push_back({i, "REMOVE", x2, y2});
                        }
                        poschk.push_back({agent.x, agent.y});
                    } else {
                        while (1) {
                            auto [dx, dy] = DIR[rnd(8)];
                            int x = agent.x + dx;
                            int y = agent.y + dy;
                            if (x < 0 || x >= w || y < 0 || y >= h) {
                                continue;
                            }
                            actions.push_back({i, "MOVE", x, y});
                            poschk.push_back({x, y});
                            break;
                        }
                    }
                }
            }
        }
        kc.setAction(actions);
        kc.waitNextTurn();
    }

    return 0;
}