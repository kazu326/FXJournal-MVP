require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase URL or Key is missing from environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedSlides() {
    const bucketName = 'learning-contents';
    const prefix = 'slides/';

    console.log("--- Checking root of learning-contents bucket ---");
    const { data: rootFiles, error: rootError } = await supabase.storage.from(bucketName).list();
    if (rootError) {
        console.error("Error listing root:", rootError);
    } else {
        console.log("Root contents:", rootFiles?.map(f => f.name));
    }
    console.log("-------------------------------------------------");

    // モジュール1〜8を処理
    for (let i = 1; i <= 8; i++) {
        const moduleName = `module_${i}`;
        const folderPath = `${prefix}${moduleName}/`;

        console.log(`Checking folder: ${folderPath}`);

        // フォルダ内のファイル一覧を取得
        const { data: files, error: listError } = await supabase
            .storage
            .from(bucketName)
            .list(folderPath);

        if (listError) {
            console.error(`Error listing folder ${folderPath}:`, listError);
            continue;
        }

        // .png 以外を除外、または.emptyなどを除外
        const imageFiles = files ? files.filter(f => f.name.endsWith('.png') || f.name.endsWith('.jpg') || f.name.endsWith('.jpeg')) : [];

        if (imageFiles.length === 0) {
            console.log(`No images found in ${folderPath}. Skipping.`);
            continue;
        }

        // 名前でソート (01.png, 02.png...)
        imageFiles.sort((a, b) => a.name.localeCompare(b.name));

        // 公開URLのリストを生成
        const imageUrls = imageFiles.map(file => {
            const { data } = supabase.storage.from(bucketName).getPublicUrl(`${folderPath}${file.name}`);
            return data.publicUrl;
        });

        console.log(`Found ${imageUrls.length} images for ${moduleName}`);

        // DBを更新 (とりあえずつTitleは段階Xとする)
        const title = `スライド学習 - 段階${i}`;
        const rewardXp = 10;

        const { error: dbError } = await supabase
            .from('learning_slides_modules')
            .upsert({
                id: `00000000-0000-0000-0000-00000000000${i}`,
                title,
                description: `レベル${i}の学習スライドです`,
                order_index: i,
                image_urls: imageUrls,
                reward_xp: rewardXp,
                is_published: true
            }, { onConflict: 'id' });

        if (dbError) {
            console.error(`Error saving to DB for ${moduleName}:`, dbError);
        } else {
            console.log(`Successfully updated DB for ${moduleName}`);
        }
    }
}

seedSlides().then(() => {
    console.log("Done.");
    process.exit(0);
});
