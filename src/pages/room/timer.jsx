import React from "react";
import FlipClockCountdown from "@leenguyen/react-flip-clock-countdown";
import "@leenguyen/react-flip-clock-countdown/dist/index.css";

const Timer = React.memo(({ onComplete, targetDate }) => {
    return (
        <div className="flex flex-col items-center">
            <FlipClockCountdown
                onComplete={onComplete}
                to={targetDate}
                renderMap={[false, false, true, true]}
                labels={["", ""]}
                labelStyle={{
                    fontSize: 10,
                    fontWeight: 100,
                    textTransform: "uppercase",
                    color: "transparent",
                    letterSpacing: "0.2em",
                    marginTop: "10px",
                }}
                digitBlockStyle={{
                    width: 20,
                    height: 40,
                    fontSize: 35,
                    fontWeight: 600,

                    color: "white",
                    borderRadius: 0,
                }}
                dividerStyle={{ height: 0, color: "white" }}
                separatorStyle={{ color: "white" }}
                duration={0.5}
                
            >
                <div className="text-red-500 font-black tracking-widest uppercase animate-pulse">
                    Session Concluded
                </div>
            </FlipClockCountdown>
        </div>
    );
});

export default Timer;
