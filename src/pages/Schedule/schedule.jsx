import BtmNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';

function schedule() {
    return (
        <>
            <Header />
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
