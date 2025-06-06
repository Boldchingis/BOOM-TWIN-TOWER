"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface Building {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  passed: boolean;
}

interface Plane {
  x: number;
  y: number;
  width: number;
  height: number;
}

const PlaneGame: React.FC = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [plane, setPlane] = useState<Plane>({
    x: 120,
    y: 500,
    width: 80,
    height: 60,
  });
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [gameSpeed, setGameSpeed] = useState(2);
  const [gameWidth, setGameWidth] = useState(360);
  const gameHeight = 600;
  const keys = useRef({ left: false, right: false });

  // Adjust game width on screen resize
  useEffect(() => {
    const updateSize = () => {
      const screenWidth = window.innerWidth;
      const mobileWidth = 360;
      const desktopMaxWidth = 800;
      setGameWidth(screenWidth < 500 ? mobileWidth : desktopMaxWidth);
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const createBuildingPair = useCallback(
    (id: number, yPos: number): Building[] => {
      const buildingWidth = 150;
      const gapWidth = 160;
      const gapPosition = Math.random() * (gameWidth - gapWidth - 200) + 60;
      return [
        {
          id: id * 2,
          x: gapPosition - buildingWidth,
          y: yPos,
          width: buildingWidth,
          height: 80,
          passed: false,
        },
        {
          id: id * 2 + 1,
          x: gapPosition + gapWidth,
          y: yPos,
          width: buildingWidth,
          height: 80,
          passed: false,
        },
      ];
    },
    [gameWidth]
  );

  const resetGame = () => {
    setPlane({ x: 120, y: 500, width: 80, height: 60 });
    const initialBuildings = [
      ...createBuildingPair(1, -150),
      ...createBuildingPair(2, -350),
      ...createBuildingPair(3, -550),
    ];
    setBuildings(initialBuildings);
    setScore(0);
    setGameSpeed(2);
    setGameOver(false);
  };

  const startGame = () => {
    setGameStarted(true);
    resetGame();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") keys.current.left = true;
      if (e.key === "ArrowRight") keys.current.right = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") keys.current.left = false;
      if (e.key === "ArrowRight") keys.current.right = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!gameStarted || gameOver) return;
    const moveLoop = setInterval(() => {
      setPlane((prev) => {
        let newX = prev.x;
        if (keys.current.left) newX = Math.max(0, newX - 5);
        if (keys.current.right)
          newX = Math.min(gameWidth - prev.width, newX + 5);
        return { ...prev, x: newX };
      });
    }, 16);
    return () => clearInterval(moveLoop);
  }, [gameStarted, gameOver, gameWidth]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;
    const gameLoop = setInterval(() => {
      setBuildings((prevBuildings) => {
        const newBuildings = prevBuildings.map((building) => ({
          ...building,
          y: building.y + gameSpeed,
        }));
        const filtered = newBuildings.filter((b) => b.y < gameHeight + 100);
        if (filtered.length < 6) {
          const last = filtered.reduce(
            (acc, b) => (b.y < acc.y ? b : acc),
            filtered[0]
          );
          const newY = last ? last.y - 250 : -150;
          filtered.push(...createBuildingPair(Date.now(), newY));
        }
        return filtered;
      });
      setGameSpeed((prev) => Math.min(prev + 0.005, 4));
    }, 16);
    return () => clearInterval(gameLoop);
  }, [gameStarted, gameOver, gameSpeed, gameHeight, createBuildingPair]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;
    let newScore = score;
    let collision = false;
    buildings.forEach((building) => {
      if (
        plane.x + 5 < building.x + building.width &&
        plane.x + plane.width - 5 > building.x &&
        plane.y + 5 < building.y + building.height &&
        plane.y + plane.height - 5 > building.y
      ) {
        collision = true;
        return;
      }
      if (!building.passed && building.y > plane.y + plane.height + 20) {
        if (building.id % 2 === 0) newScore += 1;
        setBuildings((prev) =>
          prev.map((b) => {
            const pairId = Math.floor(b.id / 2);
            const currentPairId = Math.floor(building.id / 2);
            return pairId === currentPairId ? { ...b, passed: true } : b;
          })
        );
      }
    });
    if (collision) setGameOver(true);
    if (newScore !== score) setScore(newScore);
  }, [plane, buildings, gameStarted, gameOver, score]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen  border-2  bg-black p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[url('/clouds.png')] bg-repeat opacity-20 animate-pulse"></div>

      <div className="mb-4 z-10">
        <h1 className="text-3xl font-bold text-center mb-2 text-white drop-shadow">
          2001 9 11
        </h1>
        <div className="text-center">
          <span className="text-xl font-semibold text-white drop-shadow">
            Score: {score}
          </span>
        </div>
      </div>

      {!gameStarted ? (
        <div className="text-center z-10">
          <button
            onClick={startGame}
            className="bg-red-600 hover:bg-red-800 text-black font-bold py-4 px-8 rounded-lg text-xl"
          >
            Start Game
          </button>
          <p className="mt-4 text-white">Use arrow keys to steer your plane</p>
        </div>
      ) : (
        <div
          className="relative overflow-hidden border-4 border-white rounded-lg bg-blue-100"
          style={{ width: gameWidth, height: gameHeight, maxWidth: "100%" }}
        >
          {buildings.map((building) => (
            <img
              key={building.id}
              src="/building.png"
              alt="building"
              className="absolute"
              style={{
                left: building.x,
                top: building.y,
                width: building.width,
                height: building.height,
                objectFit: "contain",
                border: "2px dashed red",
                boxSizing: "border-box",
              }}
            />
          ))}

          <img
            src="/plane.png"
            alt="plane"
            className="absolute"
            style={{
              left: plane.x,
              top: plane.y,
              width: plane.width,
              height: plane.height,
              objectFit: "contain",
              transform: `${
                keys.current.left
                  ? "rotate(-5deg)"
                  : keys.current.right
                  ? "rotate(5deg)"
                  : "rotate(0)"
              }`,
              transition: "transform 0.1s ease",
              border: "2px dashed blue", 
              boxSizing: "border-box", 
            }}
          />
        </div>
      )}

      <Dialog open={gameOver}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allaaaakh akbaaaar!</DialogTitle>
            <DialogDescription>You won!!! Final score: {score}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <button
                onClick={resetGame}
                className="bg-red-600 hover:bg-red-800 text-black font-bold py-2 px-4 rounded"
              >
                Try Again?
              </button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlaneGame;
