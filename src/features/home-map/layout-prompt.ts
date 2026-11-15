import { ROOM_TYPE_LABELS, ROOM_TYPE_VALUES } from "../../domain/home-map/home-layout";
import { formatLayoutJson } from "./format-layout-json";
import { SAMPLE_HOME_LAYOUT } from "./sample-layout";

/**
 * 間取り図の画像から JSON を作ってもらうために、AI (Claude や ChatGPT) へ画像と一緒に渡す指示。
 * 設定画面の「AI への指示をコピー」で使う。書式を変えたら HomeLayoutSchema と docs/home-map.md も直す。
 */
export const HOME_LAYOUT_PROMPT = `添付した間取り図の画像を読み取り、下の書式の JSON を 1 つだけ出力してください。説明文は要りません。

# 座標
- 単位は cm。図の左上を原点 (0, 0) とし、x は右、y は下に増やします。座標はすべて 0 以上にしてください。
- 寸法が書いてなければ畳数から見積もってください (1 畳はおよそ 182 × 91 cm)。
- 壁の厚みは無視し、隣り合う部屋は同じ座標の線で接するようにしてください。

# 書式
{
  "version": 1,
  "name": "間取りの名前 (任意)",
  "rooms": [ 部屋 ],
  "doors": [ ドア ],
  "windows": [ 窓 ]
}

部屋:
- "id": 英小文字・数字・_・- だけの、重ならない名前 (例: "dk", "bedroom")
- "name": 画面に出す部屋名 (例: "DK", "洋室 6畳" ではなく "洋室")
- "type": 次のどれか。${ROOM_TYPE_VALUES.map((t) => `"${t}" (${ROOM_TYPE_LABELS[t]})`).join(", ")}
- 形は次のどちらか一方:
  - "rect": [x, y, 幅, 奥行き] … 長方形の部屋
  - "polygon": [[x, y], [x, y], ...] … L 字などの部屋。角を順番に並べる
- "labelAt": [x, y] … 部屋名を出す位置 (任意。L 字で中心が部屋の外に出るときに書く)

ドア:
- "wall": [x1, y1, x2, y2] … 壁の上の、ドアの開口部の両端
- "kind": "hinged" (開き戸) か "sliding" (引き戸・襖)。省略すると開き戸
- "hinge": "start" か "end" … 開き戸の蝶番が wall の始点側か終点側か
- "opensInto": 開き戸が開く先の部屋の id。玄関ドアなど家の外へ開くなら "outside"

窓:
- "wall": [x1, y1, x2, y2] … 壁の上の、窓の両端。掃き出し窓も窓として書く

# ルール
- 収納・クローゼット、廊下、バルコニーも部屋として書いてください。
- キッチンとダイニングが一続きの DK や LDK は 1 つの部屋にしてください。
- 家具や家電は書かないでください。
- 書式にない項目は足さないでください。

# 例
${formatLayoutJson(SAMPLE_HOME_LAYOUT)}
`;
