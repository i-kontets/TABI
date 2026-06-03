import { useContext } from 'react';
import { TripContext } from '../../App';
import BtmNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';

function schedule() {
    const { tripName } = useContext(TripContext);
    return (
        <>
            <Header tripName={tripName}/>
            <div>
                <div style={{ padding: '20px', border: '1px solid #eee', backgroundColor: '#fff', textAlign: 'center', margin:'10px', borderRadius:'10px'}}>
                    タイムスケジュール
                </div>
                <div style={{ padding: '20px', border: '1px solid #eee', backgroundColor: '#fff', textAlign: 'center', margin:'10px', borderRadius:'10px'}}>
                    スケジュール内容
                </div>
            </div>
           <BtmNav /> 
        </>
    )
}


export default schedule
