/**
 * 管理者向け画面の表示と、管理 API から取得したデータの操作を担当します。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: 管理 API から取得した一覧や詳細データ、画面上の検索条件や入力値を主に扱います。
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../../components/Admin/AdminLayout';
import { Card, Button, EmptyState } from '../../../components/Admin/ui/Ui';
import { fetchSpot, createSpot, updateSpot, deleteSpot, spotCategories, prefectures } from '../../../services/admin';
import styles from './Spots.module.css';

/**
 * SpotForm は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function SpotForm() {
    const { spotId } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(spotId);

    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [form, setForm] = useState({
        name: '',
        category: spotCategories[0],
        prefecture: '三重県',
        address: '',
        lat: '',
        lng: '',
        status: '公開中',
    });
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [notFound, setNotFound] = useState(false);

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!isEdit) return;
        // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
        fetchSpot(spotId).then((s) => {
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (!s) {
                setNotFound(true);
                return;
            }
            setForm({ ...s });
        });
    }, [spotId, isEdit]);

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (notFound) {
        return (
            <AdminLayout title="スポット編集" back>
                <EmptyState message="スポットが見つかりません" />
            </AdminLayout>
        );
    }

    // set は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    // handleSubmit は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleSubmit = async () => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!form.name.trim()) {
            window.alert('スポット名は必須です。');
            return;
        }
        const data = { ...form, lat: Number(form.lat) || 0, lng: Number(form.lng) || 0 };
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (isEdit) {
            await updateSpot(spotId, data);
        } else {
            await createSpot(data);
        }
        navigate('/admin/spots');
    };

    // handleDelete は、画面操作や API 結果に合わせて必要な処理をまとめた関数です。
    const handleDelete = async () => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
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
