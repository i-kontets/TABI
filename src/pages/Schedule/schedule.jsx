import { useContext, useState } from 'react';
import { TripContext } from '../../App';
import BtmNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';
import styles from "./Schedulepage.module.css";

import TimelineCard from "../../components/Schedule/TimelineCard";
import MemberFilter from "../../components/Schedule/MemberFilter";
import ScheduleDetailSheet from "../../components/Schedule/ScheduleDetailSheet";

const schedules = [
  {
    id: 1,
    title: "大阪城を観光",
    start: "10:00",
    end: "12:00",
    location: "大阪城公園",
    participants: ["太郎", "次郎", "美咲"],
    color: "#EAF4FF",
  },
  {
    id: 2,
    title: "ランチ",
    start: "12:30",
    end: "13:30",
    participants: ["全員"],
    color: "#FFF6E7",
  },
  {
    id: 3,
    title: "心斎橋でショッピング",
    start: "14:00",
    end: "16:30",
    participants: ["花子", "美咲"],
    color: "#EAFBF2",
  },
];

export default function SchedulePage() {
  const { tripName } = useContext(TripContext);
  const [selectedMember, setSelectedMember] = useState("全員");
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  const filteredSchedules =
    selectedMember === "全員"
      ? schedules
      : schedules.filter((item) =>
          item.participants.includes(selectedMember)
        );

  return (
    <div className={styles.container}>
      <Header tripName={tripName} />

      <main className={styles.content}>
        <MemberFilter
          selected={selectedMember}
          onChange={setSelectedMember}
        />

        <div className={styles.timeline}>
          {filteredSchedules.map((schedule) => (
            <TimelineCard
              key={schedule.id}
              schedule={schedule}
              onClick={() => setSelectedSchedule(schedule)}
            />
          ))}
        </div>
      </main>

      <ScheduleDetailSheet
        schedule={selectedSchedule}
        onClose={() => setSelectedSchedule(null)}
      />

      <BtmNav />
    </div>
  );
}
