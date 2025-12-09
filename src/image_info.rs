use anyhow::{Context, Result};
use image::{DynamicImage, GenericImageView, ImageFormat};
use std::path::{Path, PathBuf};
use std::fs;
use humansize::{format_size, DECIMAL};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageInfo {
    pub file_path: PathBuf,
    pub file_name: String,
    pub pixel_size: (u32, u32),
    pub physical_size: (f64, f64),
    pub dpi: (u32, u32),
    pub color_mode: String,
    pub format: String,
    pub file_size: u64,
    pub thumbnail_data: Option<Vec<u8>>,
    pub error: Option<String>,
}

impl ImageInfo {
    pub fn from_path<P: AsRef<Path>>(path: P) -> Result<Self> {
        let path = path.as_ref();
        let file_path = path.to_path_buf();
        let file_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        // 获取文件大小
        let file_size = fs::metadata(path)
            .context("无法获取文件元数据")?
            .len();

        // 尝试打开图片
        match image::open(path) {
            Ok(img) => {
                let (width, height) = img.dimensions();
                let format = Self::detect_format(&img);
                let color_mode = Self::detect_color_mode(&img);
                
                // 获取DPI信息
                let dpi = Self::extract_dpi(&img);
                let (dpi_x, dpi_y) = dpi;
                
                // 计算物理尺寸（厘米）
                let width_cm = (width as f64 / dpi_x as f64) * 2.54;
                let height_cm = (height as f64 / dpi_y as f64) * 2.54;
                
                // 生成缩略图
                let thumbnail_data = Self::generate_thumbnail(&img);
                
                Ok(ImageInfo {
                    file_path,
                    file_name,
                    pixel_size: (width, height),
                    physical_size: (width_cm, height_cm),
                    dpi,
                    color_mode,
                    format,
                    file_size,
                    thumbnail_data,
                    error: None,
                })
            }
            Err(e) => {
                Ok(ImageInfo {
                    file_path,
                    file_name,
                    pixel_size: (0, 0),
                    physical_size: (0.0, 0.0),
                    dpi: (72, 72),
                    color_mode: String::new(),
                    format: String::new(),
                    file_size,
                    thumbnail_data: None,
                    error: Some(format!("无法读取图片: {}", e)),
                })
            }
        }
    }
    
    fn detect_format(img: &DynamicImage) -> String {
        // 这里简化处理，实际应该从文件头判断
        match img {
            DynamicImage::ImageLuma8(_) => "L".to_string(),
            DynamicImage::ImageLumaA8(_) => "LA".to_string(),
            DynamicImage::ImageRgb8(_) => "RGB".to_string(),
            DynamicImage::ImageRgba8(_) => "RGBA".to_string(),
            _ => "Unknown".to_string(),
        }
    }
    
    fn detect_color_mode(img: &DynamicImage) -> String {
        match img {
            DynamicImage::ImageLuma8(_) => "灰度".to_string(),
            DynamicImage::ImageLumaA8(_) => "灰度+透明度".to_string(),
            DynamicImage::ImageRgb8(_) => "RGB".to_string(),
            DynamicImage::ImageRgba8(_) => "RGBA".to_string(),
            _ => "未知".to_string(),
        }
    }
    
    fn extract_dpi(img: &DynamicImage) -> (u32, u32) {
        // 尝试从EXIF数据获取DPI
        // 注意：这里简化处理，实际应该从文件读取EXIF
        // 默认返回72 DPI
        
        // 对于某些格式，可以从image库获取DPI信息
        if let Some(dpi) = img.dimensions().0.checked_div(100) {
            // 简单估算：如果图片很大，可能DPI较高
            if dpi > 72 {
                return (dpi, dpi);
            }
        }
        
        (72, 72)
    }
    
    fn generate_thumbnail(img: &DynamicImage) -> Option<Vec<u8>> {
        // 生成128x128缩略图
        let thumbnail = img.thumbnail(128, 128);
        
        // 保存为PNG字节
        let mut buffer = Vec::new();
        match thumbnail.write_to(&mut std::io::Cursor::new(&mut buffer), ImageFormat::Png) {
            Ok(_) => Some(buffer),
            Err(_) => None,
        }
    }
    
    pub fn pixel_size_str(&self) -> String {
        format!("{}x{}", self.pixel_size.0, self.pixel_size.1)
    }
    
    pub fn physical_size_str(&self) -> String {
        format!("{:.2}x{:.2}", self.physical_size.0, self.physical_size.1)
    }
    
    pub fn dpi_str(&self) -> String {
        format!("{}x{}", self.dpi.0, self.dpi.1)
    }
    
    pub fn file_size_str(&self) -> String {
        format_size(self.file_size, DECIMAL)
    }
    
    pub fn file_extension(&self) -> String {
        self.file_path
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("")
            .to_uppercase()
            .to_string()
    }
    
    pub fn color_mode_simple(&self) -> String {
        let mode = self.color_mode.to_uppercase();
        if mode.contains("CMYK") {
            "CMYK".to_string()
        } else if mode.contains("RGB") || mode.contains("RGBA") {
            "RGB".to_string()
        } else if mode.contains("GRAY") || mode.contains("灰度") {
            "灰度".to_string()
        } else {
            mode
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchImageInfo {
    pub folder_path: PathBuf,
    pub images: Vec<ImageInfo>,
    pub total_count: usize,
    pub success_count: usize,
    pub error_count: usize,
}

impl BatchImageInfo {
    pub fn new<P: AsRef<Path>>(folder_path: P) -> Self {
        BatchImageInfo {
            folder_path: folder_path.as_ref().to_path_buf(),
            images: Vec::new(),
            total_count: 0,
            success_count: 0,
            error_count: 0,
        }
    }
    
    pub fn add_image(&mut self, info: ImageInfo) {
        self.total_count += 1;
        if info.error.is_none() {
            self.success_count += 1;
        } else {
            self.error_count += 1;
        }
        self.images.push(info);
    }
    
    pub fn sort_by_filename(&mut self) {
        self.images.sort_by(|a, b| a.file_name.cmp(&b.file_name));
    }
}

pub fn scan_folder<P: AsRef<Path>>(folder_path: P) -> Result<BatchImageInfo> {
    use rayon::prelude::*;
    
    let folder_path = folder_path.as_ref();
    
    // 支持的图片格式
    let supported_extensions = [
        "jpg", "jpeg", "png", "bmp", "gif", "tiff", "tif",
        "JPG", "JPEG", "PNG", "BMP", "GIF", "TIFF", "TIF",
    ];
    
    // 收集所有图片文件
    let mut image_files = Vec::new();
    for entry in fs::read_dir(folder_path).context("无法读取文件夹")? {
        let entry = entry.context("无法读取文件夹条目")?;
        let path = entry.path();
        
        if path.is_file() {
            if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                if supported_extensions.contains(&ext) {
                    image_files.push(path);
                }
            }
        }
    }
    
    // 使用Rayon并行处理图片
    let image_infos: Vec<ImageInfo> = image_files
        .par_iter()
        .map(|path| {
            match ImageInfo::from_path(path) {
                Ok(info) => info,
                Err(e) => {
                    ImageInfo {
                        file_path: path.clone(),
                        file_name: path.file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("unknown")
                            .to_string(),
                        pixel_size: (0, 0),
                        physical_size: (0.0, 0.0),
                        dpi: (72, 72),
                        color_mode: String::new(),
                        format: String::new(),
                        file_size: 0,
                        thumbnail_data: None,
                        error: Some(format!("处理失败: {}", e)),
                    }
                }
            }
        })
        .collect();
    
    // 创建批次信息
    let mut batch_info = BatchImageInfo::new(folder_path);
    for info in image_infos {
        batch_info.add_image(info);
    }
    
    batch_info.sort_by_filename();
    Ok(batch_info)
}