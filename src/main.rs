use eframe::egui;

mod app_simple;
mod image_info;
mod utils;
mod fonts;
mod excel_export;

use app_simple::ImageToolApp;
use fonts::configure_fonts;

fn main() -> Result<(), eframe::Error> {
    // 初始化日志
    env_logger::init();
    log::info!("启动图片信息处理工具 v2.2 (Rust重构版)");

    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([1200.0, 800.0])
            .with_title("图片信息批量处理工具 v2.2 (Rust重构版) 作者@zwm"),
        ..Default::default()
    };

    eframe::run_native(
        "图片信息批量处理工具",
        options,
        Box::new(|cc| {
            // 配置字体
            configure_fonts(&cc.egui_ctx);
            
            // 设置样式
            let mut style = (*cc.egui_ctx.style()).clone();
            style.text_styles.insert(
                egui::TextStyle::Heading,
                egui::FontId::new(18.0, egui::FontFamily::Proportional),
            );
            style.text_styles.insert(
                egui::TextStyle::Body,
                egui::FontId::new(14.0, egui::FontFamily::Proportional),
            );
            style.text_styles.insert(
                egui::TextStyle::Button,
                egui::FontId::new(14.0, egui::FontFamily::Proportional),
            );
            cc.egui_ctx.set_style(style);

            Box::new(ImageToolApp::new(cc))
        }),
    )
}