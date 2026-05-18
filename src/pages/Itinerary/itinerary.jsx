import BtmNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';

function itinerary() {
    const tripSchedule = '2026/05/14 - 2026/05/16';

    return (
        <>
            <Header subtitle={tripSchedule} />
            <div>
                しおり
            </div>
           <BtmNav /> 
        </>
    )
}

export default itinerary
