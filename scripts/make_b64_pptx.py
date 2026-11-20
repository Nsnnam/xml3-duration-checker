import base64

with open('SLIDE_BAO_CAO_GIUONG_GHEP_VA_TIEN_GIUONG_LANH_DAO.pptx', 'rb') as f:
    b64 = base64.b64encode(f.read()).decode('ascii')

content = f'''// File tự động sinh chứa dữ liệu Base64 của Slide PowerPoint Báo cáo KT251
// Giúp tải trực tiếp mọi lúc cả khi chạy Online (GitHub Pages) lẫn Offline (Single Page)
export const SLIDE_PPTX_BASE64 = "{b64}";
'''

with open('src/lib/slide-pptx-data.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('Successfully generated src/lib/slide-pptx-data.ts, length:', len(b64))
