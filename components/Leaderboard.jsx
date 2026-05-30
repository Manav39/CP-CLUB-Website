"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import members from "../json/members.json";
import Link from "next/link";
import { CircleCheck, CircleX, ArrowUp, ArrowDown } from "lucide-react";
import { LeaderboardSkeleton } from "./Skeleton";
import Image from "next/image";

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 1 day in milliseconds

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(true);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [activeTab, setActiveTab] = useState("all");
  const [sortKey, setSortKey] = useState(null);

  const filteredData =
    activeTab === "all"
      ? leaderboardData
      : leaderboardData.filter((member) =>
        activeTab === "club" ? member.inClub : !member.inClub
      );

  const fetchUserRatings = async (handles) => {
    try {
      const response = await axios.get(
        `https://codeforces.com/api/user.info?handles=${handles.join(";")}`
      );
      return response.data.result;
    } catch (error) {
      console.error("Error fetching ratings:", error);
      return [];
    }
  };

  const fetchLeetCodeRating = async () => {
    try {
      const response = await axios.get("/api/lcrating");
      const sortedData = response.data.sort((a, b) => b.rating - a.rating);
      return sortedData;
    } catch (error) {
      console.log("Error fetching leaderboard data:", error);
    }
  };

  const fetchLastFiveContests = async () => {
    try {
      const response = await axios.get(
        "https://codeforces.com/api/contest.list"
      );
      const contests = response.data.result;
      return contests
        .filter((contest) => contest.phase === "FINISHED")
        .slice(0, 5)
        .map((contest) => contest.id);
    } catch (error) {
      console.error("Error fetching contests:", error);
      return [];
    }
  };

  const getRankColor = (rating) => {
    if (rating >= 2000) return "bg-orange-500 text-white";
    if (rating >= 1800) return "bg-purple-500 text-white";
    if (rating >= 1600) return "bg-blue-500 text-white";
    if (rating >= 1400) return "bg-cyan-500 text-white";
    if (rating >= 1200) return "bg-green-500 text-white";
    return "bg-gray-500 text-white";
  };

  const getValidCodeforcesUsers = async (initialHandles) => {
    let currentHandles = [...initialHandles];
    let attempts = 0;

    while (attempts < 5 && currentHandles.length > 0) {
      try {
        const response = await axios.get(
          `https://codeforces.com/api/user.info?handles=${currentHandles.join(";")}`
        );
        return {
          validHandles: response.data.result.map(u => u.handle)
        };
      } catch (error) {
        attempts++;
        const comment = error.response?.data?.comment;

        // Extract the specific bad handle from the error message
        if (comment && comment.includes("not found")) {
          const matches = comment.match(/User with handle (.+) not found/);
          if (matches && matches[1]) {
            const badHandle = matches[1];
            console.warn(`Invalid Handle Found: ${badHandle}. Removing from list...`);

            currentHandles = currentHandles.filter(h => h !== badHandle);
            continue;
          }
        }
        console.error("Critical API Error:", error);
        break;
      }
    }
    return { validHandles: [] };
  };

  const fetchRatingsAndAttendance = async () => {
    const handles = Object.keys(members).map(
      (member) => members[member].cf_username
    );
    setIsProfileLoading(true);
    setIsAttendanceLoading(true);
    const { validHandles } = await getValidCodeforcesUsers(handles);

    const lastFiveContests = await fetchLastFiveContests();

    try {
      const attendanceMap = handles.reduce((acc, handle) => {
        acc[handle] = [false, false, false, false, false];
        return acc;
      }, {});

      const leetCodeRating = await fetchLeetCodeRating();
      const cfRatings = await fetchUserRatings(validHandles);
      const updatedMembers = [];

      for (const [username, data] of Object.entries(members)) {
        const cfData = cfRatings.find(
          (user) => user.handle === data.cf_username
        );

        const memberData = {
          ...data,
          username: username,
          rating: cfData?.rating || 0,
          maxRating: cfData?.maxRating || 0,
          rank: cfData?.rank || "N/A",
          maxRank: cfData?.maxRank || "N/A",
          titlePhoto:
            cfData?.titlePhoto || "https://userpic.codeforces.org/no-title.jpg",
          rankColor:
            cfData?.rank === "N/A"
              ? "bg-red-500 text-white"
              : getRankColor(cfData?.rating || 0),
          leetCodeRating:
            leetCodeRating.find((item) => item.username === data.lc_username)
              ?.rating || 0,
          attendance: attendanceMap[data.cf_username] === undefined ? [
            false,
            false,
            false,
            false,
            false,
          ] : attendanceMap[data.cf_username],
        };

        updatedMembers.push(memberData);
      }

      updatedMembers.sort((a, b) => b.rating - a.rating);
      setLeaderboardData(updatedMembers);
      setIsProfileLoading(false);
let handleMap={};
for(let handle of validHandles){
  handleMap[handle]=true;
};
for(let contestId of lastFiveContests) {
  try{
    let response=await axios.get(
      `https://codeforces.com/api/contest.standings?contestId=${contestId}`
    );
    let contestIndex=lastFiveContests.indexOf(contestId);
    for(let row of response.data.result.rows){
      for(let member of row.party.members){
        let handle=member.handle.toLowerCase();
        if(handleMap[handle]&&attendanceMap[handle]!=null) {
          attendanceMap[handle][contestIndex] = true;
        }
      };
    };
  }catch(error){
    console.error(`Error fetching standings for contest ${contestId}:`,error);
  }
}
      setAttendanceMap(attendanceMap);
      setIsAttendanceLoading(false);
      // console.log("Attendance Map:", attendanceMap);

      
      // console.log( "Leaderboard Data:", updatedMembers);
      const cachedData = {
        data: updatedMembers,
        attendanceMap,
        timestamp: Date.now(),
      };
      localStorage.setItem("leaderboardData", JSON.stringify(cachedData));
      localStorage.setItem("lastClearDateIST", new Date().toISOString());
    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
    } finally {
      setIsProfileLoading(false);
      setIsAttendanceLoading(false);
    }
  };

  useEffect(() => {
    const checkForMidnightIST = () => {
      const now = new Date();
      const istOffset = 330; // IST is UTC+5:30
      const istNow = new Date(now.getTime() + istOffset * 60 * 1000);

      const currentHour = istNow.getUTCHours();
      const currentMinute = istNow.getUTCMinutes();

      // Check if it's exactly 12:00 AM IST and clear the storage
      if (currentHour === 0 && currentMinute === 0) {
        localStorage.removeItem("leaderboardData");
        localStorage.setItem("lastClearDateIST", new Date().toISOString());
      }
    };

    // Set an interval to check the time every minute
    const intervalId = setInterval(checkForMidnightIST, 60000);

    const cachedData = JSON.parse(localStorage.getItem("leaderboardData"));
    const isCacheValid =
      cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION;

    if (isCacheValid) {
      if (sortKey == "leetCodeRating") {
        cachedData.data.sort((a, b) => b.leetCodeRating - a.leetCodeRating);
      }
      else if (sortKey === "attendance") {
        cachedData.data.sort((a, b) => {
          const aAttendance = a.attendance.reduce(
            (acc, val) => acc + (val ? 1 : 0),
            0
          );

          const bAttendance = b.attendance.reduce(
            (acc, val) => acc + (val ? 1 : 0),
            0
          );

          return bAttendance - aAttendance;
        });
      }

      setLeaderboardData(cachedData.data);
      setAttendanceMap(cachedData.attendanceMap);
      setIsProfileLoading(false);
      setIsAttendanceLoading(false);
    } else {
      fetchRatingsAndAttendance();
    }

    return () => clearInterval(intervalId);
  }, [sortKey]);

  if (isProfileLoading) {
    return <LeaderboardSkeleton />;
  }

  // Helper function to render rank with medals for top 3
  const renderRank = (index) => {
    const Medal = ({ className }) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15" />
        <path d="M11 12 5.12 2.2" />
        <path d="m13 12 5.88-9.8" />
        <path d="M8 7h8" />
        <circle cx="12" cy="17" r="5" />
        <path d="M12 18v-2h-.5" />
      </svg>
    );

    if (index === 0) {
      return (
        <div className="flex items-center justify-center">
          <Medal className="w-6 h-6 text-yellow-400 drop-shadow-glow" />
        </div>
      );
    }
    if (index === 1) {
      return (
        <div className="flex items-center justify-center">
          <Medal className="w-6 h-6 text-gray-300 drop-shadow-glow" />
        </div>
      );
    }
    if (index === 2) {
      return (
        <div className="flex items-center justify-center">
          <Medal className="w-6 h-6 text-orange-400 drop-shadow-glow" />
        </div>
      );
    }
    return <span className="font-mono text-zinc-400">{index + 1}</span>;
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-4 sm:p-8">
      {/* Header */}
      <div className="w-full max-w-7xl mb-8">
        <h1 className="text-4xl sm:text-5xl font-mono font-bold text-white mb-2">
          <span className="bg-gradient-to-r from-matrix-100 via-matrix-200 to-emerald-400 bg-clip-text text-transparent">
            Leaderboard
          </span>
        </h1>
        <p className="text-zinc-400 text-sm sm:text-base">
          Track your competitive programming progress
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 sm:gap-4 mb-8">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-6 py-3 rounded-lg font-mono font-medium transition-all duration-300 ${activeTab === "all"
            ? "bg-matrix-200 text-black shadow-glow-md"
            : "glass border border-white/10 text-zinc-300 hover:border-matrix-200/40 hover:text-matrix-200"
            }`}
        >
          All Members
        </button>
        <button
          onClick={() => setActiveTab("club")}
          className={`px-6 py-3 rounded-lg font-mono font-medium transition-all duration-300 ${activeTab === "club"
            ? "bg-matrix-200 text-black shadow-glow-md"
            : "glass border border-white/10 text-zinc-300 hover:border-matrix-200/40 hover:text-matrix-200"
            }`}
        >
          CP Club Members
        </button>
        <button
          onClick={() => setActiveTab("nonclub")}
          className={`px-6 py-3 rounded-lg font-mono font-medium transition-all duration-300 ${activeTab === "nonclub"
            ? "bg-matrix-200 text-black shadow-glow-md"
            : "glass border border-white/10 text-zinc-300 hover:border-matrix-200/40 hover:text-matrix-200"
            }`}
        >
          Non-CP Club Members
        </button>
      </div>

      {/* Table Card */}
      <div className="w-full max-w-7xl glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-900 text-matrix-200 border-b border-white/10">
                <th className="p-3 sm:p-4 text-left font-mono text-sm">Rank</th>
                <th className="p-3 sm:p-4 text-left font-mono text-sm">Name</th>
                <th className="p-3 sm:p-4 text-center font-mono text-sm">Year</th>
                <th className="p-3 sm:p-4 text-center font-mono text-sm">
                  <div className="flex items-center justify-center gap-2">
                    <span>LeetCode</span>
                    <button
                      onClick={() => {
                        setSortKey(sortKey === "leetCodeRating" ? null : "leetCodeRating");
                      }}
                      className="flex items-center hover:text-white transition-colors"
                    >
                      {sortKey === "leetCodeRating" ? (
                        <ArrowDown size={16} />
                      ) : (
                        <ArrowUp size={16} className="opacity-30" />
                      )}
                    </button>
                  </div>
                </th>
                <th className="p-3 sm:p-4 text-center font-mono text-sm">CF Rating</th>
                <th className="p-3 sm:p-4 text-center font-mono text-sm">CF Rank</th>
                <th className="p-3 sm:p-4 text-center font-mono text-sm">
                  <div className="flex items-center justify-center gap-2">
                    <span>Last 5</span>
                    <button
                      onClick={() => {
                        setSortKey(sortKey === "attendance" ? null : "attendance");
                      }}
                      className="flex items-center hover:text-white transition-colors"
                    >
                      {sortKey === "attendance" ? (
                        <ArrowDown size={16} />
                      ) : (
                        <ArrowUp size={16} className="opacity-30" />
                      )}
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((member, index) => (
                <tr
                  key={index}
                  className={`border-b border-white/5 transition-all duration-300 hover:scale-[1.01] hover:border-matrix-200/40 hover:shadow-glow-sm group ${index % 2 === 0 ? "bg-black/30" : "bg-zinc-900/30"
                    }`}
                >
                  {/* Rank Column with Medals */}
                  <td className="p-3 sm:p-4 text-center">
                    {renderRank(index)}
                  </td>

                  {/* Name Column with Avatar */}
                  <td className="p-3 sm:p-4">
                    <div className="flex items-center gap-3">
                      <Image
                        width={40}
                        height={40}
                        src={member.titlePhoto}
                        alt={member.name}
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full ring-2 ring-green-500 ring-offset-2 ring-offset-black"
                      />
                      <Link
                        className="text-sm sm:text-base text-zinc-300 hover:text-matrix-200 transition-colors font-medium"
                        href={`profile/${member.username}`}
                      >
                        {member.name}
                      </Link>
                    </div>
                  </td>

                  {/* Year */}
                  <td className="p-3 sm:p-4 text-center text-zinc-400 text-sm sm:text-base">
                    {member.year}
                  </td>

                  {/* LeetCode Rating */}
                  <td className="p-3 sm:p-4 text-center">
                    <a
                      href={`https://leetcode.com/${member.lc_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm sm:text-base text-matrix-200 hover:text-matrix-100 transition-colors font-mono"
                    >
                      {member.leetCodeRating}
                    </a>
                  </td>

                  {/* Codeforces Rating */}
                  <td className="p-3 sm:p-4 text-center">
                    <a
                      href={`https://codeforces.com/profile/${member.cf_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm sm:text-base text-matrix-200 hover:text-matrix-100 transition-colors font-mono"
                    >
                      {member.rating}
                    </a>
                  </td>

                  {/* Rank Badge */}
                  <td className="p-3 sm:p-4 text-center">
                    <span
                      className={`inline-block px-3 py-1 rounded-md text-xs sm:text-sm font-mono font-bold capitalize ${member.rankColor}`}
                    >
                      {member.rank}
                    </span>
                  </td>

                  {/* Attendance */}
                  <td className="p-3 sm:p-4">
                    <div className="flex gap-2 items-center justify-center">
                      {isAttendanceLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="w-4 h-4 bg-zinc-700 rounded-full animate-pulse" />
                        ))
                      ) : attendanceMap[member.cf_username]?.map((attended, i) => (
                        <span key={i}>
                          {attended ? (
                            <CircleCheck size={18} className="text-green-500" />
                          ) : (
                            <CircleX size={18} className="text-red-500/50" />
                          )}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;