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

const SkyNavigator: React.FC = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [plane, setPlane] = useState<Plane>({
    x: 200,
    y: 500,
    width: 200,
    height: 100,
  });
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [gameSpeed, setGameSpeed] = useState(2);
  const [gameWidth, setGameWidth] = useState(360);
  const gameHeight = 600;
  const keys = useRef({ left: false, right: false });

  const gameOverSoundRef = useRef<HTMLAudioElement | null>(null);

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

  const getBuildingType = (): "skyscraper" | "tower" | "office" => {
    const rand = Math.random();
    if (rand < 0.4) return "skyscraper";
    if (rand < 0.7) return "tower";
    return "office";
  };

  const getBuildingDimensions = (type: string) => {
    switch (type) {
      case "skyscraper":
        return {
          width: 120 + Math.random() * 80,
          height: 100 + Math.random() * 60,
        };
      case "tower":
        return {
          width: 80 + Math.random() * 60,
          height: 80 + Math.random() * 40,
        };
      case "office":
        return {
          width: 100 + Math.random() * 70,
          height: 60 + Math.random() * 50,
        };
      default:
        return {
          width: 100 + Math.random() * 50,
          height: 80 + Math.random() * 40,
        };
    }
  };

  const createBuildingPair = useCallback(
    (id: number, yPos: number): Building[] => {
      const minGapWidth = 140 + level * 10;
      const maxGapWidth = 180 + level * 15;
      const gapWidth =
        minGapWidth + Math.random() * (maxGapWidth - minGapWidth);

      const leftType = getBuildingType();
      const rightType = getBuildingType();
      const leftDims = getBuildingDimensions(leftType);
      const rightDims = getBuildingDimensions(rightType);

      const gapPosition = Math.random() * (gameWidth - gapWidth - 100) + 50;

      return [
        {
          id: id * 2,
          x: gapPosition - leftDims.width,
          y: yPos,
          width: leftDims.width,
          height: leftDims.height,
          passed: false,
        },
        {
          id: id * 2 + 1,
          x: gapPosition + gapWidth,
          y: yPos,
          width: rightDims.width,
          height: rightDims.height,
          passed: false,
        },
      ];
    },
    [gameWidth, level]
  );

  const resetGame = () => {
    setPlane({ x: 120, y: 500, width: 80, height: 60 });
    const initialBuildings = [
      ...createBuildingPair(1, -150),
      ...createBuildingPair(2, -400),
      ...createBuildingPair(3, -650),
    ];
    setBuildings(initialBuildings);
    setScore(0);
    setLevel(1);
    setGameSpeed(2);
    setGameOver(false);
  };

  const startGame = () => {
    setGameStarted(true);
    resetGame();
  };

  useEffect(() => {
    const newLevel = Math.floor(score / 5) + 1;
    if (newLevel !== level) {
      setLevel(newLevel);
    }

    const baseSpeed = 2;
    const speedMultiplier = 1 + score * 0.05;
    const maxSpeed = 6;
    setGameSpeed(Math.min(baseSpeed * speedMultiplier, maxSpeed));
  }, [score, level]);

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
        const moveSpeed = 6 + level * 0.5;
        if (keys.current.left) newX = Math.max(0, newX - moveSpeed);
        if (keys.current.right)
          newX = Math.min(gameWidth - prev.width, newX + moveSpeed);
        return { ...prev, x: newX };
      });
    }, 16);
    return () => clearInterval(moveLoop);
  }, [gameStarted, gameOver, gameWidth, level]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;
    const gameLoop = setInterval(() => {
      setBuildings((prevBuildings) => {
        const newBuildings = prevBuildings.map((building) => ({
          ...building,
          y: building.y + gameSpeed,
        }));
        const filtered = newBuildings.filter((b) => b.y < gameHeight + 150);

        if (filtered.length < 6) {
          const last = filtered.reduce(
            (acc, b) => (b.y < acc.y ? b : acc),
            filtered[0]
          );
          const newY = last ? last.y - (300 - level * 10) : -150;
          filtered.push(...createBuildingPair(Date.now(), newY));
        }
        return filtered;
      });
    }, 16);
    return () => clearInterval(gameLoop);
  }, [gameStarted, gameOver, gameSpeed, gameHeight, createBuildingPair, level]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;
    let newScore = score;
    let collision = false;

    buildings.forEach((building) => {
      const planeHitbox = {
        left: plane.x + 8,
        right: plane.x + plane.width - 8,
        top: plane.y + 4,
        bottom: plane.y + plane.height - 4,
      };

      const buildingHitbox = {
        left: building.x,
        right: building.x + building.width,
        top: building.y,
        bottom: building.y + building.height,
      };

      if (
        planeHitbox.left < buildingHitbox.right &&
        planeHitbox.right > buildingHitbox.left &&
        planeHitbox.top < buildingHitbox.bottom &&
        planeHitbox.bottom > buildingHitbox.top
      ) {
        collision = true;
        return;
      }

      if (!building.passed && building.y > plane.y + plane.height + 30) {
        if (building.id % 2 === 0) {
          newScore += 1;
        }
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

  useEffect(() => {
    if (gameOver) {
      gameOverSoundRef.current?.play();
    }
  }, [gameOver]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-400 via-blue-300 to-blue-200 p-4 relative overflow-hidden">
      <audio ref={gameOverSoundRef} src="/gameover.mp3" preload="auto" />

      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full opacity-60"
            style={{
              width: `${60 + Math.random() * 40}px`,
              height: `${30 + Math.random() * 20}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${6 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="mb-4 z-10 text-center">
        <h1 className="text-4xl font-bold mb-2 text-white drop-shadow-lg">
          ALLAHH AKBAAAR
        </h1>
        <div className="flex gap-6 justify-center">
          <span className="text-xl font-semibold text-white drop-shadow">
            Score: {score}
          </span>
          <span className="text-xl font-semibold text-white drop-shadow">
            Level: {level}
          </span>
          <span className="text-lg font-medium text-white drop-shadow">
            Speed: {gameSpeed.toFixed(1)}x
          </span>
        </div>
      </div>

      {!gameStarted ? (
        <div className="text-center z-10 bg-white bg-opacity-90 p-8 rounded-lg shadow-lg">
          <button
            onClick={startGame}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-xl mb-4 transition-colors"
          >
            LETS BOMB TWIN TOWER ABDUL BABY
          </button>
          <p className="text-gray-700 text-lg">
            Navigate through the city skyline!
          </p>
          <p className="text-gray-600">
            Use ← → arrow keys to steer your aircraft
          </p>
        </div>
      ) : (
        <div
          className="relative overflow-hidden border-4 border-white rounded-lg shadow-2xl"
          style={{
            width: gameWidth,
            height: gameHeight,
            maxWidth: "100%",
            background:
              "linear-gradient(to bottom, #87CEEB 0%, #98D8E8 50%, #B0E0E6 100%)",
          }}
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
                border: "2px dashed red",
                objectFit: "cover",
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
              border: "2px dashed blue",
              objectFit: "contain",
              transform: `${
                keys.current.left
                  ? "rotate(-8deg)"
                  : keys.current.right
                  ? "rotate(8deg)"
                  : "rotate(0)"
              }`,
              transition: "transform 0.15s ease",
            }}
          />
        </div>
      )}

      <Dialog open={gameOver}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center">
              GREAT JOB MR.TERRORIST
            </DialogTitle>
            <DialogDescription className="text-center text-lg">
              Great flying, muhammid! You just Bombed {score} people!
              <br />
              <span className="font-semibold">Final Level: {level}</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="justify-center">
            <DialogClose asChild>
              <button
                onClick={resetGame}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Bomb Again
              </button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
};

export default SkyNavigator;
