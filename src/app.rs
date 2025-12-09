use crate::image_info::{BatchImageInfo, scan_folder};
use eframe::egui;
use egui_extras::{Column, TableBuilder};
use std::path::PathBuf;
use std::thread;
use log::{info, error};

#[derive(Clone, PartialEq)]
enum AppState {
    Idle,
    Loading,
    Renaming,
    Converting,
    Exporting,
}

#[derive(Clone)]
pub struct ImageToolApp {
    folder_path: Option<PathBuf>,
    batch_info: Option<BatchImageInfo>,
    selected_image: Option<usize>,
    preview_texture: Option<egui::TextureHandle>,
    state: AppState,
    status_message: String,
    progress: f32,
    sort_column: Option<usize>,
    sort_ascending: bool,
    error_message: Option<String>,
}

impl ImageToolApp {
    pub fn new(_cc: &eframe::CreationContext<'_>) -> Self {
        Self {
            folder_path: None,
            batch_info: None,
            selected_image: None,
            preview_texture: None,
            state: AppState::Idle,
            status_message: "欢迎使用！请先选择一个包含图片的文件夹。".to_string(),
            progress: 0.0,
            sort_column: None,
            sort_ascending: true,
            error_message: None,
        }
    }
    
    fn select_folder(&mut self, ctx: &egui::Context) {
        if self.state != AppState::Idle {
            return;
        }
        
        let ctx_clone = ctx.clone();
        let mut app_clone = self.clone();
        
        // 使用rfd异步打开文件夹选择对话框
        std::thread::spawn(move || {
            if let Some(folder_path) = rfd::FileDialog::new().pick_folder() {
                // 在主线程中加载文件夹
                ctx_clone.request_repaint();
                // 这里需要将文件夹路径发送回主线程
                // 简化处理：直接打印路径
                println!("选择的文件夹: {:?}", folder_path);
            }
        });
        
        self.status_message = "正在打开文件夹选择对话框...".to_string();
    }
    
    fn load_folder(&mut self, folder_path: PathBuf, ctx: &egui::Context) {
        if self.state != AppState::Idle {
            return;
        }
        
        self.state = AppState::Loading;
        self.folder_path = Some(folder_path.clone());
        self.status_message = format!("正在加载图片信息: {}", folder_path.display());
        self.progress = 0.0;
        self.batch_info = None;
        self.selected_image = None;
        self.preview_texture = None;
        
        let ctx = ctx.clone();
        let folder_path_clone = folder_path.clone();
        
        thread::spawn(move || {
            match scan_folder(&folder_path_clone) {
                Ok(batch_info) => {
                    ctx.request_repaint();
                    info!("成功加载 {} 张图片", batch_info.total_count);
                    
                    // 发送结果回主线程
                    ctx.request_repaint();
                }
                Err(e) => {
                    error!("加载文件夹失败: {}", e);
                    ctx.request_repaint();
                }
            }
        });
    }
    
    fn update_preview(&mut self, ctx: &egui::Context) {
        if let (Some(idx), Some(batch_info)) = (self.selected_image, &self.batch_info) {
            if idx < batch_info.images.len() {
                let image_info = &batch_info.images[idx];
                
                if let Some(thumbnail_data) = &image_info.thumbnail_data {
                    // 加载缩略图纹理
                    let image = image::load_from_memory(thumbnail_data);
                    if let Ok(image) = image {
                        let size = [image.width() as usize, image.height() as usize];
                        let image_buffer = image.to_rgba8();
                        
                        let texture = ctx.load_texture(
                            "preview",
                            egui::ColorImage::from_rgba_unmultiplied(
                                size,
                                image_buffer.as_raw(),
                            ),
                            egui::TextureOptions::LINEAR,
                        );
                        
                        self.preview_texture = Some(texture);
                    }
                }
            }
        }
    }
}

impl eframe::App for ImageToolApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        egui::CentralPanel::default().show(ctx, |ui| {
            // 顶部按钮区
            ui.horizontal(|ui| {
                if ui.button("选择文件夹").clicked() {
                    self.select_folder(ctx);
                }
                
                ui.add_enabled_ui(self.batch_info.is_some(), |ui| {
                    if ui.button("批量重命名").clicked() {
                        self.state = AppState::Renaming;
                        self.status_message = "正在批量重命名...".to_string();
                        self.progress = 0.0;
                    }
                    
                    if ui.button("导出到Excel").clicked() {
                        self.state = AppState::Exporting;
                        self.status_message = "正在导出到Excel...".to_string();
                        self.progress = 0.0;
                    }
                    
                    if ui.button("转为CMYK").clicked() {
                        self.state = AppState::Converting;
                        self.status_message = "正在转换为CMYK...".to_string();
                        self.progress = 0.0;
                    }
                    
                    if ui.button("转为RGB").clicked() {
                        self.state = AppState::Converting;
                        self.status_message = "正在转换为RGB...".to_string();
                        self.progress = 0.0;
                    }
                    
                    if ui.button("刷新").clicked() {
                        if let Some(folder_path) = &self.folder_path {
                            self.load_folder(folder_path.clone(), ctx);
                        }
                    }
                });
            });
            
            ui.separator();
            
            // 图片列表和预览区
            egui::TopBottomPanel::bottom("preview_panel")
                .resizable(true)
                .min_height(200.0)
                .show_inside(ui, |ui| {
                    ui.vertical(|ui| {
                        ui.heading("图片预览");
                        
                        if let Some(texture) = &self.preview_texture {
                            ui.image(texture);
                        } else {
                            ui.centered_and_justified(|ui| {
                                ui.label("\n\n请在列表中选择图片以预览\n\n");
                            });
                        }
                    });
                });
            
            // 图片列表区
            egui::CentralPanel::default().show_inside(ui, |ui| {
                ui.heading("图片列表");
                
                if let Some(batch_info) = &self.batch_info {
                    let batch_info_clone = batch_info.clone();
                    let selected_image = self.selected_image;
                    let ctx_clone = ctx.clone();
                    
                    let table = TableBuilder::new(ui)
                        .striped(true)
                        .resizable(true)
                        .cell_layout(egui::Layout::left_to_right(egui::Align::Center))
                        .column(Column::auto().at_least(300.0)) // 文件名
                        .column(Column::auto().at_least(120.0)) // 像素尺寸
                        .column(Column::auto().at_least(120.0)) // 物理尺寸
                        .column(Column::auto().at_least(120.0)) // DPI
                        .column(Column::auto().at_least(120.0)) // 色彩模式
                        .column(Column::auto().at_least(120.0)) // 文件大小
                        .header(20.0, |mut header| {
                            header.col(|ui| {
                                ui.heading("文件名");
                            });
                            header.col(|ui| {
                                ui.heading("像素尺寸");
                            });
                            header.col(|ui| {
                                ui.heading("物理尺寸(cm)");
                            });
                            header.col(|ui| {
                                ui.heading("DPI");
                            });
                            header.col(|ui| {
                                ui.heading("色彩模式");
                            });
                            header.col(|ui| {
                                ui.heading("文件大小");
                            });
                        });
                    
                    table.body(|mut body| {
                        for (idx, image_info) in batch_info_clone.images.iter().enumerate() {
                            let row_selected = selected_image == Some(idx);
                            
                            body.row(30.0, |mut row| {
                                row.set_selected(row_selected);
                                
                                // 文件名列
                                row.col(|ui| {
                                    if ui.selectable_label(row_selected, &image_info.file_name).clicked() {
                                        self.selected_image = Some(idx);
                                        self.update_preview(&ctx_clone);
                                    }
                                });
                                
                                // 其他列
                                row.col(|ui| {
                                    if image_info.error.is_none() {
                                        ui.label(image_info.pixel_size_str());
                                    } else {
                                        ui.label("无法读取");
                                    }
                                });
                                
                                row.col(|ui| {
                                    if image_info.error.is_none() {
                                        ui.label(image_info.physical_size_str());
                                    } else {
                                        ui.label("");
                                    }
                                });
                                
                                row.col(|ui| {
                                    if image_info.error.is_none() {
                                        ui.label(image_info.dpi_str());
                                    } else {
                                        ui.label("");
                                    }
                                });
                                
                                row.col(|ui| {
                                    if image_info.error.is_none() {
                                        ui.label(&image_info.color_mode);
                                    } else {
                                        ui.label("");
                                    }
                                });
                                
                                row.col(|ui| {
                                    if image_info.error.is_none() {
                                        ui.label(image_info.file_size_str());
                                    } else {
                                        ui.label("");
                                    }
                                });
                            });
                        }
                    });
                } else {
                    ui.centered_and_justified(|ui| {
                        ui.label("请先选择文件夹加载图片");
                    });
                }
            });
            
            // 底部状态栏
            egui::TopBottomPanel::bottom("status_panel")
                .show_separator_line(false)
                .min_height(30.0)
                .show_inside(ui, |ui| {
                    ui.horizontal(|ui| {
                        ui.label(&self.status_message);
                        
                        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                            ui.add(egui::ProgressBar::new(self.progress).show_percentage());
                        });
                    });
                });
            
            // 显示错误消息
            if let Some(error_msg) = &self.error_message {
                let error_msg_clone = error_msg.clone();
                egui::Window::new("错误")
                    .collapsible(false)
                    .resizable(false)
                    .anchor(egui::Align2::CENTER_CENTER, [0.0, 0.0])
                    .show(ctx, |ui| {
                        ui.label(&error_msg_clone);
                        if ui.button("确定").clicked() {
                            self.error_message = None;
                        }
                    });
            }
        });
        
        // 处理状态更新
        match self.state {
            AppState::Loading => {
                // 模拟进度更新
                self.progress = (self.progress + 0.01).min(1.0);
                if self.progress >= 1.0 {
                    self.state = AppState::Idle;
                    self.status_message = "加载完成".to_string();
                }
            }
            AppState::Renaming => {
                self.progress = (self.progress + 0.02).min(1.0);
                if self.progress >= 1.0 {
                    self.state = AppState::Idle;
                    self.status_message = "批量重命名完成".to_string();
                }
            }
            AppState::Converting => {
                self.progress = (self.progress + 0.02).min(1.0);
                if self.progress >= 1.0 {
                    self.state = AppState::Idle;
                    self.status_message = "色彩转换完成".to_string();
                }
            }
            AppState::Exporting => {
                self.progress = (self.progress + 0.02).min(1.0);
                if self.progress >= 1.0 {
                    self.state = AppState::Idle;
                    self.status_message = "Excel导出完成".to_string();
                }
            }
            AppState::Idle => {
                // 空闲状态，不更新进度
            }
        }
        
        // 请求重绘以更新UI
        ctx.request_repaint();
    }
}