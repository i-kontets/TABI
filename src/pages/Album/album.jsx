import BtmNav from '../../components/bottomNav/BottomNav';
import Header from '../../components/header/Header';

function Album() {
    return (
        <>
            <Header />
            <div>
                <div style={{ padding: '20px', border: '1px solid #eee', backgroundColor: '#fff', textAlign: 'center', margin:'10px', borderRadius:'10px'}}>
                    画像
                </div>
            </div>
           <BtmNav /> 
        </>
    )
}

export default Album
