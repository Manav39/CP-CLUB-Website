import axios from "axios";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req) {
    const url = new URL(req.url);
    const contestId = url.searchParams.get("contestId");

    if (!contestId) {
        return NextResponse.json({ error: "Missing contestId" }, { status: 400 });
    }

    // Load members.json
    const filePath = path.resolve(process.cwd(), "json/members.json");
    let userMapping = {};
    let userRefMapping = {};

    try {
        const data = fs.readFileSync(filePath, "utf-8");
        const users = JSON.parse(data);

        userMapping = Object.fromEntries(
            Object.values(users).map((user) => [user.cf_username, user.name])
        );
        userRefMapping = Object.fromEntries(
            Object.entries(users).map(([key, user]) => [user.cf_username, key])
        );
    } catch (error) {
        console.error("Error reading JSON file:", error);
        return NextResponse.json({ error: "Failed to read users file" }, { status: 500 });
    }

    try {
        // Query only your club members using handles
        const response = await axios.get(`https://codeforces.com/api/contest.standings?contestId=${contestId}`);

        if (response.data.status === "OK") {
            const standings = response.data.result.rows;

            // Deduplicate by handle, prefer CONTESTANT > PRACTICE > VIRTUAL
            const uniqueMap = new Map();

            for (const row of standings) {
                const handle = row.party.members[0].handle;
                if (userMapping[handle]) {
                const type = row.party.participantType;

                if (!uniqueMap.has(handle)) {
                    uniqueMap.set(handle, row); // first appearance
                } else {
                    // prefer official participation if multiple exist
                    const existing = uniqueMap.get(handle);
                    const priority = { CONTESTANT: 3, OUT_OF_COMPETITION: 2, PRACTICE: 1, VIRTUAL: 0 };
                    if ((priority[type] || 0) > (priority[existing.party.participantType] || 0)) {
                        uniqueMap.set(handle, row);
                    }
                }
            }
            }
            const formattedData = Array.from(uniqueMap.values()).map((row) => {
                const handle = row.party.members[0].handle;
                const userName = userMapping[handle] || "Unknown";
                const ref = userRefMapping[handle] || "Unknown";

                return {
                    name: userName,
                    handle,
                    standing: row.rank==0 ? "-" : row.rank,
                    points: row.points,
                    penalty: row.penalty,
                    participantType: row.party.participantType,
                    ref,
                };
            });

            return NextResponse.json(formattedData, { status: 200 });
        } else {
            console.error("CF API Error:", response.data);
            return NextResponse.json({ error: response.data.comment }, { status: 500 });
        }
    } catch (error) {
        console.error("Error fetching Codeforces API data:", error.response?.data || error.message);
        return NextResponse.json(
            { error: "Failed to fetch data from Codeforces API", details: error.response?.data || error.message },
            { status: 500 }
        );
    }
}
