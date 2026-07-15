#!/usr/bin/env python3
"""
SAVAN Certificate Render Engine — called by Next.js API route
Reads args JSON, renders each certificate, outputs JSON result.
"""
import sys, json, os, io, re, base64, tempfile
from pathlib import Path

def main():
    args_path = sys.argv[1]
    with open(args_path) as f:
        args = json.load(f)

    # Load persistent assets
    assets_path = args['assets_path']
    if not os.path.exists(assets_path):
        print(json.dumps({'success': False, 'error': f'Assets not found: {assets_path}'}))
        sys.exit(1)

    with open(assets_path) as f:
        assets = json.load(f)

    # Lazy imports (these are always available on the server)
    from fontTools.ttLib import TTFont
    from fontTools.pens.svgPathPen import SVGPathPen
    from PIL import Image
    import numpy as np
    import cairosvg

    # Load SVGs
    svg1_orig = base64.b64decode(assets['svg1']).decode('utf-8')
    svg2_orig = base64.b64decode(assets['svg2']).decode('utf-8')

    # Load fonts
    def load_font(data_b64, suffix='.ttf'):
        tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
        tmp.write(base64.b64decode(data_b64)); tmp.close()
        from fontTools.ttLib import TTFont
        tt = TTFont(tmp.name)
        return dict(upm=tt['head'].unitsPerEm, cmap=tt.getBestCmap(),
                    hmtx=tt['hmtx'], gs=tt.getGlyphSet(), _tmp=tmp.name)

    NF  = load_font(assets['engoerg'])
    RKF = load_font(assets['rockwell_regular'], '.otf')
    GIF = load_font(assets['georgia_italic'])

    # Constants
    UPP=2540/72; CX=7400; MAX_W=11666; NAME_BASE=10500-419.171
    NAME_FILL="#000066"; ID_SIZE=282.22; DATE_SIZE=352.77
    SIG2_CX=10516; SIG2_LOCAL_CX=SIG2_CX-3201.97
    COLLAB_X=10556; COLLAB_Y=1288; COLLAB_W=2489; COLLAB_H=2481
    MONTHS=["January","February","March","April","May","June",
            "July","August","September","October","November","December"]

    def sfx(n):
        return 'th' if 11<=n<=13 else {1:'st',2:'nd',3:'rd'}.get(n%10,'th')

    def _adv(f, ch):
        g = f['cmap'].get(ord(ch))
        if g is None: return int(f['upm']*0.25) if ch==' ' else int(f['upm']*0.4)
        return f['hmtx'][g][0]

    def _wem(f, s): return sum(_adv(f,ch) for ch in s)

    def outline(f, s, sz, x0, y0, fill, anchor="middle", gid="t"):
        sc=sz/f['upm']; tw=_wem(f,s)*sc; x=(x0-tw/2) if anchor=="middle" else x0; parts=[]
        for ch in s:
            g=f['cmap'].get(ord(ch))
            if g and ch!=' ':
                pen=SVGPathPen(f['gs']); f['gs'][g].draw(pen); d=pen.getCommands()
                if d: parts.append(f'<path d="{d}" transform="translate({x:.3f} {y0:.3f}) scale({sc:.6f} {-sc:.6f})"/>')
            x+=_adv(f,ch)*sc
        return f'<g id="{gid}" fill="{fill}">'+"".join(parts)+"</g>", tw

    def fit_pt(s):
        for pt in range(24,13,-1):
            if _wem(NF,s)*(pt*UPP/NF['upm'])<=MAX_W: return pt
        return 14

    # Regex anchors
    RECIP_RE     = re.compile(r'<g transform="matrix\(1 0 0 1 -9\.32148 -419\.171\)">.*?</g>', re.S)
    CERTID_RE_T1 = re.compile(r'<g transform="matrix\(0\.999997 0 0 0\.999997 -5918\.46 -8978\.04\)">.*?</g>', re.S)
    CERTID_RE_T2 = re.compile(r'<g transform="matrix\(0\.999997 0 0 0\.999997 -5918\.46 -6395\.7\)">.*?</g>', re.S)
    PROMOTED_RE  = re.compile(r'<g transform="matrix\(1 0 0 1 15\.2385 9990\.25\)">.*?</g>', re.S)
    DATE_RE      = re.compile(r'<text[^>]*class="[^"]*fnt0[^"]*"[^>]*>.*?</text>(?:\s*<text[^>]*class="[^"]*fnt0[^"]*"[^>]*>.*?</text>){1,10}', re.S)
    SIG2_NAME_RE = re.compile(r'<g transform="matrix\(1 0 0 1 3201\.97 9021\.61\)">.*?</g>', re.S)
    SIG2_TITL_RE = re.compile(r'<text[^>]*id="second_Signtory_desigation"[^>]*>.*?</text>', re.S)

    def make_sig(img_bytes):
        img=Image.open(io.BytesIO(img_bytes)).convert('RGBA'); data=np.array(img)
        r,g,b,a=data[:,:,0],data[:,:,1],data[:,:,2],data[:,:,3]
        br=r.astype(int)+g.astype(int)+b.astype(int)
        data[:,:,3]=np.where(br>680,0,255)
        mid=(br>450)&(br<=680); data[:,:,3][mid]=((680-br[mid])/230*255).astype(np.uint8)
        res=Image.fromarray(data,'RGBA'); buf=io.BytesIO(); res.save(buf,'PNG')
        return base64.b64encode(buf.getvalue()).decode(), res.size[0], res.size[1]

    # Load sig1
    sig1_uri, sig1_w, sig1_h = make_sig(base64.b64decode(assets['sig1']))

    def find_close(text, start):
        depth=0; i=start
        while i<len(text):
            if text[i:i+2]=='<g': depth+=1; i+=2
            elif text[i:i+4]=='</g>':
                depth-=1
                if depth==0: return i+4
                i+=4
            else: i+=1
        return -1

    def strip_photo_nodes(svg, tt):
        svg=re.sub(r'\s*<polygon id="passport_photo_container"[^>]*/>',' ',svg)
        if tt=='T1':
            svg=re.sub(r'\s*<g style="clip-path:url\(#id2\)">.*?</g>',' ',svg,flags=re.S)
            svg=re.sub(r'\s*<polygon class="fil7" points="10595,1808[^"]*"/>',' ',svg)
            svg=re.sub(r'\s*<polygon class="fil1" points="10595,1808[^"]*"/>',' ',svg)
        else:
            svg=re.sub(r'\s*<g style="clip-path:url\(#id3\)">.*?</g>',' ',svg,flags=re.S)
            svg=re.sub(r'\s*<polygon class="fil7" points="6156,1428[^"]*"/>',' ',svg)
        i=svg.find('<g style="clip-path:url(#id4)">')
        if i>=0: j=find_close(svg,i); svg=svg[:i]+' '+svg[j:]
        if tt=='T2':
            i=svg.find('<g style="clip-path:url(#id7)">')
            if i>=0: j=find_close(svg,i); svg=svg[:i]+' '+svg[j:]
        return svg

    def photo_block(photo_path, x, y, w, h):
        with open(photo_path,'rb') as f: pb=f.read()
        mime="image/png" if pb[:4]==b'\x89PNG' else "image/jpeg"
        uri=f"data:{mime};base64,{base64.b64encode(pb).decode()}"
        return (f'<clipPath id="pc"><rect x="{x}" y="{y}" width="{w}" height="{h}"/></clipPath>'
                f'<g clip-path="url(#pc)"><image x="{x}" y="{y}" width="{w}" height="{h}" '
                f'preserveAspectRatio="xMidYMid slice" xlink:href="{uri}"/></g>'
                f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="none" stroke="#000066" stroke-width="20"/>')

    def sig_img_tag(uri, sw, sh, cx, ytop, w=2970):
        h=int(w*sh/sw); x=int(cx-w/2)
        return f'<image x="{x}" y="{ytop}" width="{w}" height="{h}" preserveAspectRatio="xMidYMid meet" xlink:href="data:image/png;base64,{uri}"/>'

    # Render each participant
    tt = args['template']
    t2 = (tt == 'T2')
    svg_orig = svg2_orig if t2 else svg1_orig

    # Prepare base SVG (brand images, sig, collab logo — shared across batch)
    base = strip_photo_nodes(svg_orig, tt)
    base = re.sub(r'xlink:href="[^"]*ImgID1\.png"',
                  f'xlink:href="data:image/png;base64,{assets["trans_logo"]}"', base)
    base = re.sub(r'xlink:href="[^"]*ImgID2\.png"',
                  f'xlink:href="data:image/png;base64,{assets["seal"]}"', base)
    logo_id = r'ImgID4\.png' if not t2 else r'ImgID3\.png'
    base = re.sub(rf'xlink:href="[^"]*{logo_id}"',
                  f'xlink:href="data:image/png;base64,{assets["savan_logo"]}"', base)

    # T2 collab logo
    if t2 and args.get('collab_logo_path'):
        with open(args['collab_logo_path'],'rb') as f: cl_data=f.read()
        cl_b64=base64.b64encode(cl_data).decode()
        base=re.sub(r'xlink:href="[^"]*ImgID6\.png"',
                    f'xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="', base)
        cx=COLLAB_X+COLLAB_W//2; cy=COLLAB_Y+COLLAB_H//2; r=min(COLLAB_W,COLLAB_H)//2
        logo_inj=(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#FFFFCC"/>'
                  f'<image x="{COLLAB_X}" y="{COLLAB_Y}" width="{COLLAB_W}" height="{COLLAB_H}" '
                  f'preserveAspectRatio="xMidYMid meet" xlink:href="data:image/png;base64,{cl_b64}"/>')
        base=base.replace('</svg>', logo_inj+'\n</svg>')

    # Sig1
    sig1_cx = CX if not t2 else 4100
    base = base.replace('</svg>', sig_img_tag(sig1_uri, sig1_w, sig1_h, sig1_cx, 17800)+'\n</svg>')

    # T2 sig2
    if t2:
        if args.get('collab_sig_path'):
            with open(args['collab_sig_path'],'rb') as f: s2_bytes=f.read()
            s2_uri, s2_w, s2_h = make_sig(s2_bytes)
            base = base.replace('</svg>', sig_img_tag(s2_uri, s2_w, s2_h, int(SIG2_CX), 17800)+'\n</svg>')
        if args.get('collab_signer_name'):
            cng,_=outline(RKF, args['collab_signer_name'], 423.33, SIG2_LOCAL_CX, 10500, "black","middle","sig2n")
            base=SIG2_NAME_RE.sub(f'<g transform="matrix(1 0 0 1 3201.97 9021.61)">{cng}</g>',base,count=1)
        if args.get('collab_signer_title'):
            ctg,_=outline(GIF, args['collab_signer_title'], 324.56, SIG2_CX, 19892,"#373435","middle","sig2t")
            base=SIG2_TITL_RE.sub(ctg,base,count=1)

    # Sponsored by
    sponsored_by = args.get('sponsored_by','')
    if sponsored_by and not t2:
        pg,_=outline(GIF,f"Sponsored by {sponsored_by}.",ID_SIZE*0.92,CX,10500,"#000066","middle","promo")
        base=PROMOTED_RE.sub(f'<g transform="matrix(1 0 0 1 15.2385 9990.25)">{pg}</g>',base,count=1)
    else:
        base=PROMOTED_RE.sub('',base,count=1)

    certificates = []
    work_dir = args['work_dir']

    for p in args['participants']:
        from datetime import datetime
        d = datetime.strptime(p['date'], '%Y-%m-%d')
        date_line=f"{d.day}{sfx(d.day)} of {MONTHS[d.month-1]}, {d.year}."
        cert_id=f"SAVAN/BLSAED/{p['year']}/{str(p['month']).zfill(2)}{p['session']}/{str(p['seq']).zfill(3)}"

        svg = base

        # Name
        pt=fit_pt(p['name'])
        ng,_=outline(NF,p['name'],pt*UPP,CX,NAME_BASE,NAME_FILL,"middle","rname")
        svg=RECIP_RE.sub(ng,svg,count=1)

        # Cert ID
        ig,_=outline(RKF,cert_id,ID_SIZE,7400,10500,"#000066","start","certid")
        cmat="-5918.46 -8978.04" if not t2 else "-5918.46 -6395.7"
        svg=(CERTID_RE_T2 if t2 else CERTID_RE_T1).sub(
            f'<g transform="matrix(0.999997 0 0 0.999997 {cmat})">{ig}</g>',svg,count=1)

        # Date
        dg,_=outline(RKF,date_line,DATE_SIZE,CX,13327,"black","middle","date")
        svg=DATE_RE.sub(dg,svg,count=1)

        # Photo
        if p.get('photo'):
            x,y,w,h=(10344,1525,2989,3285) if not t2 else (5906,1145,2989,3285)
            sh_x,sh_y,sh_w,sh_h=((10380,1570,3050,3380) if not t2 else (5940,1190,3050,3380))
            shadow_tag=(f'<image x="{sh_x}" y="{sh_y}" width="{sh_w}" height="{sh_h}" '
                        f'preserveAspectRatio="none" '
                        f'xlink:href="data:image/png;base64,{assets["photo_shadow"]}"/>')
            svg=svg.replace('</svg>', shadow_tag+'\n'+photo_block(p['photo'],x,y,w,h)+'\n</svg>')

        # Render to PDF
        safe_name=re.sub(r'[^A-Za-z0-9]+','_',p['name']).strip('_')
        pdf_path=os.path.join(work_dir,f"{str(p['seq']).zfill(3)}_{safe_name}.pdf")
        cairosvg.svg2pdf(bytestring=svg.encode('utf-8'), write_to=pdf_path)

        certificates.append({
            'cert_id':  cert_id,
            'name':     p['name'],
            'date':     p['date'],
            'pdf_path': pdf_path,
            'pt':       pt,
        })

    # Clean up temp font files
    for f in [NF, RKF, GIF]:
        try: os.unlink(f['_tmp'])
        except: pass

    print(json.dumps({'success': True, 'certificates': certificates}))

if __name__ == '__main__':
    main()
