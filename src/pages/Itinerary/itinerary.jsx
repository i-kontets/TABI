import { useLocation } from "react-router-dom";
import { useContext } from "react";
import { TripContext } from "../../App";
import BtmNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';


function itinerary() {
    const location = useLocation();
    const { tripName } = useContext(TripContext);
    console.log("Itinerary:", tripName);
    return (
        <>
            <Header tripName={tripName} />
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
