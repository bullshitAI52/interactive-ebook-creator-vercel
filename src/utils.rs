use crate::image_info::ImageInfo;
use anyhow::{Context, Result};
use chrono::Local;
use image::{DynamicImage, ImageFormat};
use std::fs;
use std::path::{Path, PathBuf};
use jpeg_encoder::{Encoder as JpegRawEncoder, ColorType as JpegColorType, Density};

#[allow(dead_code)]
pub fn format_file_size(size: u64) -> String {
    if size >= 1024 * 1024 {
        format!("{:.2} MB", size as f64 / (1024.0 * 1024.0))
    } else {
        format!("{:.2} KB", size as f64 / 1024.0)
    }
}

pub fn rename_file_by_size<P: AsRef<Path>>(
    file_path: P,
    width_cm: f64,
    height_cm: f64,
) -> Result<PathBuf> {
    let file_path = file_path.as_ref();
    let parent = file_path.parent().context("无法获取父目录")?;
    let file_stem = file_path.file_stem().context("无法获取文件主干名")?;
    let extension = file_path.extension().context("无法获取文件扩展名")?;

    // 构建新文件名：原文件名_宽x高cm.扩展名
    let new_name = format!(
        "{}_{}x{}cm.{}",
        file_stem.to_string_lossy(),
        width_cm.round() as u32,
        height_cm.round() as u32,
        extension.to_string_lossy()
    );

    let new_path = parent.join(new_name);

    // 处理文件名冲突
    let final_path = handle_name_conflict(&new_path)?;

    // 重命名文件
    fs::rename(file_path, &final_path).context("重命名文件失败")?;

    Ok(final_path)
}

pub fn batch_rename_by_size<P: AsRef<Path>>(
    folder_path: P,
    image_infos: &[ImageInfo],
) -> Result<Vec<(String, String)>> {
    let folder_path = folder_path.as_ref();
    let mut results = Vec::new();
    let mut existing_files = std::collections::HashSet::new();

    // 收集现有文件
    for entry in fs::read_dir(folder_path).context("无法读取文件夹")? {
        let entry = entry.context("无法读取文件夹条目")?;
        if entry.path().is_file() {
            if let Some(file_name) = entry.file_name().to_str() {
                existing_files.insert(file_name.to_string());
            }
        }
    }

    for image_info in image_infos {
        if image_info.error.is_some() {
            results.push((
                image_info.file_name.clone(),
                format!("跳过: {}", image_info.error.as_ref().unwrap()),
            ));
            continue;
        }

        let original_path = folder_path.join(&image_info.file_name);
        if !original_path.exists() {
            results.push((image_info.file_name.clone(), "文件不存在".to_string()));
            continue;
        }

        let (width_cm, height_cm) = image_info.physical_size;

        match rename_file_by_size(&original_path, width_cm, height_cm) {
            Ok(new_path) => {
                if let Some(new_file_name) = new_path.file_name().and_then(|n| n.to_str()) {
                    // 更新文件集合
                    existing_files.remove(&image_info.file_name);
                    existing_files.insert(new_file_name.to_string());

                    results.push((
                        image_info.file_name.clone(),
                        format!("成功 -> {}", new_file_name),
                    ));
                }
            }
            Err(e) => {
                results.push((image_info.file_name.clone(), format!("失败: {}", e)));
            }
        }
    }

    Ok(results)
}

fn handle_name_conflict(path: &Path) -> Result<PathBuf> {
    if !path.exists() {
        return Ok(path.to_path_buf());
    }

    let parent = path.parent().context("无法获取父目录")?;
    let file_stem = path.file_stem().context("无法获取文件主干名")?;
    let extension = path.extension().context("无法获取文件扩展名")?;

    let mut counter = 1;
    loop {
        let new_name = format!(
            "{}_{}.{}",
            file_stem.to_string_lossy(),
            counter,
            extension.to_string_lossy()
        );
        let new_path = parent.join(new_name);

        if !new_path.exists() {
            return Ok(new_path);
        }

        counter += 1;
        if counter > 1000 {
            anyhow::bail!("尝试了太多次重命名，可能存在无限循环");
        }
    }
}

fn rgb_to_cmyk_improved(rgb_img: &DynamicImage) -> DynamicImage {
    // 简化处理：将CMYK转换为RGBA（4通道）
    // 实际应该创建4通道图像，但image库可能不支持直接创建CMYK
    // 这里返回RGB图像作为占位符
    rgb_img.clone()
}

pub fn convert_color_mode(img: &DynamicImage, target_mode: &str) -> Result<DynamicImage> {
    match target_mode.to_uppercase().as_str() {
        "RGB" => {
            let rgb_img = match img {
                DynamicImage::ImageRgb8(_) => img.clone(),
                _ => img.to_rgb8().into(),
            };
            Ok(rgb_img)
        }
        "RGBA" => {
            let rgba_img = match img {
                DynamicImage::ImageRgba8(_) => img.clone(),
                _ => img.to_rgba8().into(),
            };
            Ok(rgba_img)
        }
        "GRAY" | "GRAYSCALE" => {
            let gray_img = match img {
                DynamicImage::ImageLuma8(_) => img.clone(),
                _ => img.to_luma8().into(),
            };
            Ok(gray_img)
        }
        "CMYK" => {
            // CMYK requires special handling during save, 
            // so we return the RGB image here and handle conversion in batch_convert_color_mode
             let rgb_img = match img {
                DynamicImage::ImageRgb8(_) => img.clone(),
                _ => img.to_rgb8().into(),
            };
            Ok(rgb_img)
        }
        _ => anyhow::bail!("不支持的色彩模式: {}", target_mode),
    }
}

fn save_as_cmyk(img: &DynamicImage, path: &Path) -> Result<()> {
    let rgb = img.to_rgb8();
    let width = rgb.width();
    let height = rgb.height();
    let mut cmyk_data = Vec::with_capacity((width * height * 4) as usize);

    for pixel in rgb.pixels() {
        let r = pixel[0] as f32 / 255.0;
        let g = pixel[1] as f32 / 255.0;
        let b = pixel[2] as f32 / 255.0;

        let k = 1.0 - r.max(g).max(b);
        let c = if k < 1.0 { (1.0 - r - k) / (1.0 - k) } else { 0.0 };
        let m = if k < 1.0 { (1.0 - g - k) / (1.0 - k) } else { 0.0 };
        let y = if k < 1.0 { (1.0 - b - k) / (1.0 - k) } else { 0.0 };

        // Naive conversion often usually results in inverted CMYK for JPEGs (Adobe style),
        // but standard math is:
        // C = 255 * c
        // M = 255 * m
        // Y = 255 * y
        // K = 255 * k
        // However, JPEGs often store CMYK as inverted (255-val).
        // Let's stick to standard byte values first.
        
        cmyk_data.push((c * 255.0) as u8);
        cmyk_data.push((m * 255.0) as u8);
        cmyk_data.push((y * 255.0) as u8);
        cmyk_data.push((k * 255.0) as u8);
    }

    let mut encoder = JpegRawEncoder::new_file(path, 95)?; // Quality 95
    encoder.set_density(Density::Inch { x: 300, y: 300 });
    
    // Use jpeg-encoder's ColorType::Cmyk which allows 4-channel encoding
    encoder.encode(&cmyk_data, width as u16, height as u16, JpegColorType::Cmyk)
        .map_err(|e| anyhow::anyhow!("编码错误: {}", e))?; 
        
    Ok(())
}

pub fn batch_convert_color_mode<P: AsRef<Path>>(
    folder_path: P,
    output_folder: P,
    image_infos: &[ImageInfo],
    target_mode: &str,
) -> Result<Vec<(String, String)>> {
    let folder_path = folder_path.as_ref();
    let output_folder = output_folder.as_ref();
    let mut results = Vec::new();

    // 创建输出文件夹
    fs::create_dir_all(output_folder).context("创建输出文件夹失败")?;

    for image_info in image_infos.iter() {
        if image_info.error.is_some() {
            results.push((
                image_info.file_name.clone(),
                format!("跳过: {}", image_info.error.as_ref().unwrap()),
            ));
            continue;
        }

        let original_path = folder_path.join(&image_info.file_name);
        if !original_path.exists() {
            results.push((image_info.file_name.clone(), "文件不存在".to_string()));
            continue;
        }

        // 检查是否已经是目标模式
        if image_info.color_mode.to_uppercase() == target_mode.to_uppercase() {
            results.push((
                image_info.file_name.clone(),
                format!("跳过: 已是 {} 模式", target_mode),
            ));
            continue;
        }

        // 构建输出路径
        let file_stem = original_path.file_stem().context("无法获取文件主干名")?;
        let extension = original_path.extension().context("无法获取文件扩展名")?;

        // 根据目标模式选择输出格式
        let output_extension = if target_mode.to_uppercase() == "CMYK" {
            "jpg".to_string()
        } else {
            extension.to_string_lossy().to_string()
        };

        let output_file_name = format!("{}.{}", file_stem.to_string_lossy(), output_extension);
        let output_path = output_folder.join(&output_file_name);

        // 转换图片
        match image::open(&original_path) {
            Ok(img) => {
                if target_mode.to_uppercase() == "CMYK" {
                     match save_as_cmyk(&img, &output_path) {
                        Ok(_) => {
                            results.push((
                                image_info.file_name.clone(),
                                format!("成功(CMYK) -> {}", output_file_name),
                            ));
                        }
                        Err(e) => {
                            results.push((
                                image_info.file_name.clone(),
                                format!("CMYK转换失败: {}", e),
                            ));
                        }
                     }
                } else {
                    match convert_color_mode(&img, target_mode) {
                        Ok(converted_img) => {
                            // 保存转换后的图片
                            let format = if output_extension.to_lowercase() == "jpg"
                                || output_extension.to_lowercase() == "jpeg"
                            {
                                ImageFormat::Jpeg
                            } else if output_extension.to_lowercase() == "png" {
                                ImageFormat::Png
                            } else {
                                // 尝试根据扩展名推断格式
                                ImageFormat::from_extension(&output_extension)
                                    .unwrap_or(ImageFormat::Png)
                            };

                            match save_image_with_format(&converted_img, &output_path, format, Some(95))
                            {
                                Ok(_) => {
                                    results.push((
                                        image_info.file_name.clone(),
                                        format!("成功 -> {}", output_file_name),
                                    ));
                                }
                                Err(e) => {
                                    results.push((
                                        image_info.file_name.clone(),
                                        format!("保存失败: {}", e),
                                    ));
                                }
                            }
                        }
                        Err(e) => {
                            results.push((image_info.file_name.clone(), format!("转换失败: {}", e)));
                        }
                    }
                }
            }
            Err(e) => {
                results.push((image_info.file_name.clone(), format!("打开失败: {}", e)));
            }
        }
    }

    Ok(results)
}

pub fn save_image_with_format<P: AsRef<Path>>(
    img: &DynamicImage,
    path: P,
    format: ImageFormat,
    quality: Option<u8>,
) -> Result<()> {
    let path = path.as_ref();

    match format {
        ImageFormat::Jpeg => {
            let _quality = quality.unwrap_or(95);
            img.save_with_format(path, ImageFormat::Jpeg)?;
        }
        ImageFormat::Png => {
            img.save_with_format(path, ImageFormat::Png)?;
        }
        _ => {
            img.save_with_format(path, format)?;
        }
    }

    Ok(())
}

#[allow(dead_code)]
pub fn get_timestamp() -> String {
    Local::now().format("%Y%m%d_%H%M%S").to_string()
}

#[allow(dead_code)]
pub fn create_unique_directory<P: AsRef<Path>>(base_path: P, prefix: &str) -> Result<PathBuf> {
    let base_path = base_path.as_ref();
    let timestamp = get_timestamp();

    let mut counter = 0;
    loop {
        let dir_name = if counter == 0 {
            format!("{}_{}", prefix, timestamp)
        } else {
            format!("{}_{}_{}", prefix, timestamp, counter)
        };

        let dir_path = base_path.join(dir_name);

        if !dir_path.exists() {
            fs::create_dir_all(&dir_path).context("创建目录失败")?;
            return Ok(dir_path);
        }

        counter += 1;
        if counter > 100 {
            anyhow::bail!("无法创建唯一目录，尝试次数过多");
        }
    }
}

#[allow(dead_code)]
pub fn is_image_file<P: AsRef<Path>>(path: P) -> bool {
    let path = path.as_ref();

    if !path.is_file() {
        return false;
    }

    let supported_extensions = [
        "jpg", "jpeg", "png", "bmp", "gif", "tiff", "tif", "JPG", "JPEG", "PNG", "BMP", "GIF",
        "TIFF", "TIF",
    ];

    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| supported_extensions.contains(&ext))
        .unwrap_or(false)
}

#[allow(dead_code)]
pub fn compress_image<P: AsRef<Path>>(
    input_path: P,
    output_path: P,
    _quality: u8,
    max_width: Option<u32>,
    max_height: Option<u32>,
) -> Result<()> {
    let input_path = input_path.as_ref();
    let output_path = output_path.as_ref();

    // 打开图片
    let img = image::open(input_path).context("打开图片失败")?;

    // 调整尺寸（如果需要）
    let img = if let (Some(max_w), Some(max_h)) = (max_width, max_height) {
        img.resize(max_w, max_h, image::imageops::FilterType::Lanczos3)
    } else if let Some(max_w) = max_width {
        img.resize(max_w, img.height(), image::imageops::FilterType::Lanczos3)
    } else if let Some(max_h) = max_height {
        img.resize(img.width(), max_h, image::imageops::FilterType::Lanczos3)
    } else {
        img
    };

    // 根据输出文件扩展名选择格式
    let extension = output_path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("jpg")
        .to_lowercase();

    match extension.as_str() {
        "jpg" | "jpeg" => {
            img.save_with_format(output_path, image::ImageFormat::Jpeg)?;
        }
        "png" => {
            // PNG不支持质量参数，但可以调整压缩级别
            img.save_with_format(output_path, image::ImageFormat::Png)?;
        }
        "webp" => {
            // WebP压缩
            img.save_with_format(output_path, image::ImageFormat::WebP)?;
        }
        _ => {
            // 默认使用原格式
            img.save(output_path).context("保存图片失败")?;
        }
    }

    Ok(())
}

#[allow(dead_code)]
pub fn batch_compress_images<P: AsRef<Path>>(
    folder_path: P,
    output_folder: P,
    quality: u8,
    max_width: Option<u32>,
    max_height: Option<u32>,
    image_infos: &[ImageInfo],
) -> Result<Vec<(String, String)>> {
    let folder_path = folder_path.as_ref();
    let output_folder = output_folder.as_ref();
    let mut results = Vec::new();

    // 创建输出文件夹
    fs::create_dir_all(output_folder).context("创建输出文件夹失败")?;

    for image_info in image_infos {
        if image_info.error.is_some() {
            results.push((
                image_info.file_name.clone(),
                format!("跳过: {}", image_info.error.as_ref().unwrap()),
            ));
            continue;
        }

        let original_path = folder_path.join(&image_info.file_name);
        if !original_path.exists() {
            results.push((image_info.file_name.clone(), "文件不存在".to_string()));
            continue;
        }

        // 构建输出路径
        let file_stem = original_path.file_stem().context("无法获取文件主干名")?;
        let extension = original_path.extension().context("无法获取文件扩展名")?;

        let output_file_name = format!(
            "{}.{}",
            file_stem.to_string_lossy(),
            extension.to_string_lossy()
        );
        let output_path = output_folder.join(&output_file_name);

        // 压缩图片
        match compress_image(&original_path, &output_path, quality, max_width, max_height) {
            Ok(_) => {
                let original_size = image_info.file_size;
                let new_size = fs::metadata(&output_path).map(|m| m.len()).unwrap_or(0);

                let compression_ratio = if original_size > 0 {
                    format!(
                        " ({:.1}%)",
                        (new_size as f64 / original_size as f64) * 100.0
                    )
                } else {
                    String::new()
                };

                results.push((
                    image_info.file_name.clone(),
                    format!("成功{} -> {}", compression_ratio, output_file_name),
                ));
            }
            Err(e) => {
                results.push((image_info.file_name.clone(), format!("失败: {}", e)));
            }
        }
    }

    Ok(results)
}
