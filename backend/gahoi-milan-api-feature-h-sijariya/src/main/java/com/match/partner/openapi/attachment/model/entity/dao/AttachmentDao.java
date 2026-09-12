package com.match.partner.openapi.attachment.model.entity.dao;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Table(name = "attachment")
@Entity
public class AttachmentDao {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private String name;
    private String type;
    private String path;
    private Integer userId;
    
    @Column(name = "is_primary", columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean isPrimary = false;
}
