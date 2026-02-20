package com.pos.service;

import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MinIOService {

    private final MinioClient minioClient;
    private final String bucketName = "product-images";

    public String uploadFile(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("file must not be null or empty");
        }

        String originalName = file.getOriginalFilename();
        String extension = "";
        if (originalName != null && originalName.contains(".")) {
            extension = originalName.substring(originalName.lastIndexOf('.'));
        } else if (file.getContentType() != null && file.getContentType().contains("/")) {
            extension = "." + file.getContentType().substring(file.getContentType().lastIndexOf('/') + 1);
        }

        String objectName = UUID.randomUUID() + extension;

        minioClient.putObject(
                PutObjectArgs.builder()
                        .bucket(bucketName)
                        .object(objectName)
                        .stream(file.getInputStream(), file.getSize(), -1)
                        .contentType(file.getContentType())
                        .build()
        );

        return objectName;
    }

    public byte[] getFile(String objectName) throws Exception {
        if (objectName == null || objectName.isBlank()) {
            throw new IllegalArgumentException("object name must not be null or blank");
        }
        try (var inputStream = minioClient.getObject(
                GetObjectArgs.builder()
                        .bucket(bucketName)
                        .object(objectName)
                        .build())) {
            return inputStream.readAllBytes();
        }
    }
}

