from pathlib import Path
import base64, json, re, zipfile
root=Path(__file__).resolve().parents[1]
dist=root/'dist'
downloads=dist/'downloads'
skill=root/'skill'/'seazen-sap-ui'
with zipfile.ZipFile(downloads/'seazen-sap-ui-skill.zip','w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(skill.rglob('*')):
        if p.is_file():z.write(p,Path('seazen-sap-ui')/p.relative_to(skill))
html=(dist/'index.html').read_text()
html=re.sub(r'<link rel="stylesheet" href="(assets/[^"]+)">',lambda m:'<style>\n'+(dist/m[1]).read_text()+'\n</style>',html)
html=re.sub(r'<script defer src="(assets/[^"]+)"></script>',lambda m:'<script>\n'+(dist/m[1]).read_text().replace('</script','<\\/script')+'\n</script>',html)
# Inline scripts must execute after the body exists, unlike the deferred source files.
scripts=re.findall(r'<script>[\s\S]*?</script>',html)
html=re.sub(r'<script>[\s\S]*?</script>','',html)
logo='data:image/svg+xml;base64,'+base64.b64encode((dist/'assets/mark.svg').read_bytes()).decode()
html=html.replace('assets/mark.svg',logo)
embedded={p.name:base64.b64encode(p.read_bytes()).decode() for p in downloads.iterdir() if p.is_file() and p.suffix in ['.md','.json','.css','.js','.zip'] and p.name!='seazen-sap-design-system.zip'}
download_script='''<script>
const embeddedDownloads=EMBEDDED;
document.addEventListener('click',function(e){const a=e.target.closest('a[download]');if(!a)return;const key=a.getAttribute('href').replace('downloads/','');if(!embeddedDownloads[key])return;e.preventDefault();const bytes=Uint8Array.from(atob(embeddedDownloads[key]),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([bytes]));const link=document.createElement('a');link.href=url;link.download=key;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);},true);
</script>'''.replace('EMBEDDED',json.dumps(embedded,ensure_ascii=False))
html=html.replace('</body>','\n'+'\n'.join(scripts)+'\n'+download_script+'\n</body>')
(dist/'standalone.html').write_text(html)
def package(target,include_nested):
    with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
        for directory in ['dist','docs','skill','scripts']:
            for p in sorted((root/directory).rglob('*')):
                if not p.is_file() or '__pycache__' in p.parts:continue
                if p==downloads/'seazen-sap-design-system.zip' and not include_nested:continue
                z.write(p,Path('seazen-sap-design-system')/p.relative_to(root))
        z.write(root/'README.md','seazen-sap-design-system/README.md')
package(downloads/'seazen-sap-design-system.zip',False)
package(root/'seazen-sap-design-system.zip',True)
print(json.dumps({'standaloneBytes':(dist/'standalone.html').stat().st_size,'packageBytes':(root/'seazen-sap-design-system.zip').stat().st_size,'skillBytes':(downloads/'seazen-sap-ui-skill.zip').stat().st_size}))
