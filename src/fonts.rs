use eframe::egui;
use std::collections::BTreeMap;

pub fn configure_fonts(ctx: &egui::Context) {
    let mut fonts = egui::FontDefinitions::default();
    
    // 尝试加载系统字体
    let system_fonts = [
        // macOS 字体
        "/System/Library/Fonts/Hiragino Sans GB.ttc",      // 冬青黑体简体中文
        "/System/Library/Fonts/AppleSDGothicNeo.ttc",      // Apple SD Gothic Neo (包含中文)
        "/System/Library/Fonts/STHeiti Medium.ttc",        // 华文黑体
        // Linux 字体
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        // Windows 字体
        "C:/Windows/Fonts/msyh.ttc",                       // 微软雅黑
    ];
    
    let mut font_added = false;
    
    for font_path in &system_fonts {
        if std::path::Path::new(font_path).exists() {
            match std::fs::read(font_path) {
                Ok(font_bytes) => {
                    fonts.font_data.insert(
                        "chinese".to_owned(),
                        egui::FontData::from_owned(font_bytes),
                    );
                    log::info!("成功加载字体: {}", font_path);
                    font_added = true;
                    break;
                }
                Err(e) => {
                    log::warn!("无法读取字体 {}: {}", font_path, e);
                }
            }
        }
    }
    
    if font_added {
        // 将中文字体添加到比例字体族
        fonts
            .families
            .entry(egui::FontFamily::Proportional)
            .or_default()
            .insert(0, "chinese".to_owned());
        
        // 也将中文字体添加到等宽字体族
        fonts
            .families
            .entry(egui::FontFamily::Monospace)
            .or_default()
            .push("chinese".to_owned());
    } else {
        log::warn!("未找到系统字体，使用默认字体");
    }
    
    ctx.set_fonts(fonts);
}