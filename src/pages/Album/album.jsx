import { useContext } from 'react';
import { TripContext } from '../../App';
import BtmNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';

function Album() {
    const { tripName } = useContext(TripContext);

    return (
        <>
            <Header tripName={tripName}/>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', padding: '10px' }}>
                <div style={{ padding: '20px', border: '1px solid #eee', backgroundColor: '#fff', textAlign: 'center', borderRadius:'10px', height:'200px'}}>
                    画像group
                </div>
                <div style={{ padding: '20px', border: '1px solid #eee', backgroundColor: '#fff', textAlign: 'center', borderRadius:'10px', height:'200px'}}>
                    画像group
                </div>
                <div style={{ padding: '20px', border: '1px solid #eee', backgroundColor: '#fff', textAlign: 'center', borderRadius:'10px', height:'200px'}}>
                    画像group
                </div>
                <div style={{ padding: '20px', border: '1px solid #eee', backgroundColor: '#fff', textAlign: 'center', borderRadius:'10px', height:'200px'}}>
                    画像group
                </div>
                <div style={{ padding: '20px', border: '1px solid #eee', backgroundColor: '#fff', textAlign: 'center', borderRadius:'10px', height:'200px'}}>
                    画像group
                </div>
            </div>
           <BtmNav /> 
        </>
    )
}

export default Album
