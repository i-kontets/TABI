import BtmNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';

function itinerary() {
    const tripSchedule = '2026/05/14 - 2026/05/16';

    return (
        <>
            <Header subtitle={tripSchedule} />
            <div>
                <div style={{ padding: '20px', border: '1px solid #eee', backgroundColor: '#827171', textAlign: 'center', margin:'10px', borderRadius:'10px'}}>
                    しおり内容
                </div>
                <div style={{ padding: '20px', border: '1px solid #eee', backgroundColor: '#827171', textAlign: 'center', margin:'10px', borderRadius:'10px'}}>
                    しおり内容
                </div>
            </div>
           <BtmNav /> 
        </>
    )
}

export default itinerary
