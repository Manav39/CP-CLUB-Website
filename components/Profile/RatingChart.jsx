"use client";
import React, { useRef, useEffect, useState } from "react";
import { Chart } from "chart.js/auto";

const RatingChart = ({ data }) => {
  const [lcDates, setLcDates] = useState([]);
  const [lcRatings, setLcRatings] = useState([]);
  const [cfDates, setCfDates] = useState([]);
  const [cfRatings, setCfRatings] = useState([]);
  const chartRef = useRef(null);

  useEffect(() => {
    if (data.contestsData?.leetCodeContestsData?.length > 0) {
      const sortedLcData = data.contestsData.leetCodeContestsData.sort(
        (a, b) => a.startTime - b.startTime
      );
      setLcDates(
        sortedLcData.map((item) => formatDate(item.contest.startTime))
      );
      setLcRatings(sortedLcData.map((item) => item.rating));
    } else {
      setLcDates([]);
      setLcRatings([]);
    }

    if (data.contestsData?.codeForcesContestsData?.length > 0) {
      const sortedCfData = data.contestsData.codeForcesContestsData.sort(
        (a, b) => a.ratingUpdateTimeSeconds - b.ratingUpdateTimeSeconds
      );
      setCfDates(
        sortedCfData.map((item) => formatDate(item.ratingUpdateTimeSeconds))
      );
      setCfRatings(sortedCfData.map((item) => item.newRating));
    } else {
      setCfDates([]);
      setCfRatings([]);
    }
  }, [data]);

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString();
  };

  useEffect(() => {
    console.log(chartRef.current);

    if (lcRatings.length > 0 || cfRatings.length > 0) {
      const ctx = chartRef.current.getContext("2d");

      const lcGradient = ctx.createLinearGradient(0, 0, 0, 400);
      lcGradient.addColorStop(0, "rgba(121, 178, 250, 0.7)");
      lcGradient.addColorStop(1, "rgba(121, 178, 250, 0)");

      const cfGradient = ctx.createLinearGradient(0, 0, 0, 400);
      cfGradient.addColorStop(0, "rgba(255, 99, 132, 0.7)");
      cfGradient.addColorStop(1, "rgba(255, 99, 132, 0)");

      const labels = lcDates.length > cfDates.length ? lcDates : cfDates;

      const chartData = {
        labels,
        datasets: [
          lcRatings.length > 0 && {
            label: "LeetCode Rating",
            data: lcRatings,
            // fill: true,
            backgroundColor: lcGradient,
            borderColor: "rgba(121, 178, 250, 1)",
            borderWidth: 2,
            tension: 0.4,
          },
          cfRatings.length > 0 && {
            label: "Codeforces Rating",
            data: cfRatings,
            // fill: true,
            backgroundColor: cfGradient,
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 2,
            tension: 0.4,
          },
        ].filter(Boolean), // Filters out any empty datasets
      };

      const chartOptions = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: (tooltipItem) =>
                `${tooltipItem.dataset.label}: ${tooltipItem.raw}`,
            },
          },
          legend: {
            display: true,
          },
        },
        scales: {
          x: {
            display: false,
          },
          y: {
            title: { display: true, text: "Rating" },
            min:
              Math.min(
                ...lcRatings.concat(cfRatings).filter((v) => v != null)
              ) ===
              Math.max(...lcRatings.concat(cfRatings).filter((v) => v != null))
                ? 0
                : Math.min(
                    ...lcRatings.concat(cfRatings).filter((v) => v != null)
                  ),
            max:
              Math.max(
                ...lcRatings.concat(cfRatings).filter((v) => v != null)
              ) + 300,
            ticks: {
              stepSize: 50,
            },
          },
        },
      };

      const myChart = new Chart(ctx, {
        type: "line",
        data: chartData,
        options: chartOptions,
      });

      return () => myChart.destroy();
    }
  }, [lcRatings, cfRatings, lcDates, cfDates]);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 600,
        margin: "0 auto",
        textAlign: "start",
        overflow: "hidden",
        height: "100%",
      }}
    >
      <div>
        <p className="text-sm">Contests Rating</p>
        <p className="text-gray-500 mt-2">
          {data.contestsData?.leetCodeContestsData?.length === 0 &&
            data.contestsData?.codeForcesContestsData?.length === 0 &&
            "No Contests Data"}
        </p>
      </div>
      {(data.contestsData?.leetCodeContestsData?.length > 0 ||
        data.contestsData?.codeForcesContestsData?.length > 0) && (
        <div style={{ width: "100%" }}>
          <canvas ref={chartRef}></canvas>
        </div>
      )}
    </div>
  );
};

export default RatingChart;
