// dist-artifact/ の app.js と app.css を、Artifact に公開できる1枚のHTMLにまとめる
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const dir = 'dist-artifact';
const find = (ext) => readFileSync(`${dir}/app${ext}`, 'utf8');
const js = find('.js').replace(/<\/script/gi, '<\\/script');
const css = find('.css');

const html = `<title>旅程ノート</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="color-scheme" content="light dark">
<style>
${css}
</style>
<div id="root"></div>
<script>
${js}
</script>
`;
writeFileSync(`${dir}/ryotei-note.html`, html);
console.log(`wrote ${dir}/ryotei-note.html (${(html.length / 1024).toFixed(0)} KB)`);
