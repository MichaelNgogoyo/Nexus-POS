package com.pos.service;

import com.pos.dto.BlogRequest;
import com.pos.model.Blog;

public interface IBlogService {

    public Blog createBlog(BlogRequest blogRequest);
}
