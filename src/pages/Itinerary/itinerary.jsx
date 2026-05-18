import { useLocation } from "react-router-dom";
import BtmNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';

function itinerary() {
    const location = useLocation();
    const place = location.state?.place;
    return (
        <>
            <Header place = {place} />
            <div>
                <div style={{ padding: '20px', border: '1px solid #eee', backgroundColor: '#fff', textAlign: 'center', margin:'10px', borderRadius:'10px'}}>
                    しおり内容
                </div>
                <div style={{ padding: '20px', border: '1px solid #eee', backgroundColor: '#fff', textAlign: 'center', margin:'10px', borderRadius:'10px'}}>
                    しおり内容
                </div>
            </div>
           <BtmNav /> 
        </>
    )
}

export default itinerary
