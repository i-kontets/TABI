import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { Card, Button, EmptyState } from '../../../components/Admin/ui/Ui';
import { fetchSpot, createSpot, updateSpot, deleteSpot, spotCategories, prefectures } from '../../../services/admin';
import styles from './Spots.module.css';

export default function SpotForm() {
    const { spotId } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(spotId);

    const [form, setForm] = useState({
        name: '',
        category: spotCategories[0],
        prefecture: '三重県',
        address: '',
        lat: '',
        lng: '',
        status: '公開中',
    });
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!isEdit) return;
        fetchSpot(spotId).then((s) => {
            if (!s) {
                setNotFound(true);
                return;
            }
            setForm({ ...s });
        });
    }, [spotId, isEdit]);

    if (notFound) {
        return (
            <AdminLayout title="スポット編集" back>
                <EmptyState message="スポットが見つかりません" />
            </AdminLayout>
        );
    }

    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    const handleSubmit = async () => {
        if (!form.name.trim()) {
            window.alert('スポット名は必須です。');
            return;
        }
        const data = { ...form, lat: Number(form.lat) || 0, lng: Number(form.lng) || 0 };
        if (isEdit) {
            await updateSpot(spotId, data);
        } else {
            await createSpot(data);
        }
        navigate('/admin/spots');
    };

    const handleDelete = async () => {
        if (!window.confirm('このスポットを削除しますか?')) return;
        await deleteSpot(spotId);
        navigate('/admin/spots');
    };

    return (
        <AdminLayout title={isEdit ? 'スポット編集' : 'スポット追加'} back>
            <Card title="基本情報">
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>スポット名 <em>必須</em></span>
                    <input type="text" value={form.name} onChange={set('name')} placeholder="伊勢神宮" />
                </label>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>カテゴリ <em>必須</em></span>
                    <select value={form.category} onChange={set('category')}>
                        {spotCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                </label>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>都道府県 <em>必須</em></span>
                    <select value={form.prefecture} onChange={set('prefecture')}>
                        {prefectures.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                </label>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>住所</span>
                    <input type="text" value={form.address} onChange={set('address')} placeholder="三重県伊勢市宇治館町1" />
                </label>
                <div className={styles.latLngRow}>
                    <label className={styles.field}>
                        <span className={styles.fieldLabel}>緯度</span>
                        <input type="text" value={form.lat} onChange={set('lat')} placeholder="34.4893" />
                    </label>
                    <label className={styles.field}>
                        <span className={styles.fieldLabel}>経度</span>
                        <input type="text" value={form.lng} onChange={set('lng')} placeholder="136.7097" />
                    </label>
                </div>
                <label className={styles.toggleRow}>
                    <span className={styles.fieldLabel}>公開設定</span>
                    <span className={styles.toggleWrap}>
                        公開する
                        <input
                            type="checkbox"
                            checked={form.status === '公開中'}
                            onChange={(e) => setForm({ ...form, status: e.target.checked ? '公開中' : '非公開' })}
                        />
                    </span>
                </label>
            </Card>

            <Button variant="primary" full onClick={handleSubmit}>保存する</Button>
            {isEdit && (
                <div className={styles.deleteRow}>
                    <Button variant="dangerOutline" full onClick={handleDelete}>削除する</Button>
                </div>
            )}
        </AdminLayout>
    );
}
