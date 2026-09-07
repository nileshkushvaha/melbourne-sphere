import { Body, Controller, Get, Header, HttpCode, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RequestContext } from '../auth/auth.service.js';
import { CurrentAdmin, RequirePermissions, type AuthenticatedRequest } from '../auth/decorators.js';
import { getRequestId } from '../common/request-id.js';
import type { AdminPrincipal } from '../identity/identity.service.js';
import { BlogService } from './blog.service.js';
import { ChangeSlugDto } from '../seo/dto/redirect.dto.js';
import {
  AuthorDto,
  AuthorInputDto,
  BlogTermDto,
  BlogTermInputDto,
  BlogTermStateDto,
  CreatePostDto,
  ListPostsQueryDto,
  PostDto,
  PostPreviewDto,
  PostRevisionDto,
  PostStateDto,
  PostSummaryDto,
  SchedulePostDto,
  UpdateAuthorDto,
  UpdateBlogTermDto,
  UpdatePostDto,
} from './dto/blog.dto.js';

const ctxOf = (req: AuthenticatedRequest): RequestContext => ({ ip: req.ip ?? 'unknown', userAgent: req.headers['user-agent'], requestId: getRequestId(req) });

/** Public author attribution management (SRS BLOG 001). */
@ApiTags('admin-blog')
@Controller('admin/authors')
export class AuthorsAdminController {
  constructor(private readonly blog: BlogService) {}

  @RequirePermissions('posts.write')
  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: [AuthorDto] })
  async list() {
    return { data: await this.blog.listAuthors() };
  }

  @RequirePermissions('posts.write')
  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'One author profile with links, photo and counts' })
  @ApiOkResponse({ type: AuthorDto })
  async getAuthor(@Param('id') id: string) {
    return { data: await this.blog.getAuthor(id) };
  }

  @RequirePermissions('posts.write')
  @Post()
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: AuthorDto })
  async create(@Body() body: AuthorInputDto, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    return { data: await this.blog.createAuthor(body, actor, ctxOf(req)) };
  }

  @RequirePermissions('posts.write')
  @Patch(':id')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: AuthorDto })
  async update(@Param('id') id: string, @Body() body: UpdateAuthorDto, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    return { data: await this.blog.updateAuthor(id, body, actor, ctxOf(req)) };
  }

  @RequirePermissions('posts.write')
  @Post(':id/activate')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async activate(@Param('id') id: string, @Body() body: BlogTermStateDto, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    return { data: await this.blog.setAuthorActive(id, true, body.expectedVersion, actor, ctxOf(req)) };
  }

  @RequirePermissions('posts.write')
  @Post(':id/deactivate')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async deactivate(@Param('id') id: string, @Body() body: BlogTermStateDto, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    return { data: await this.blog.setAuthorActive(id, false, body.expectedVersion, actor, ctxOf(req)) };
  }
}

/** Editorial categories (SRS BLOG 005). */
@ApiTags('admin-blog')
@Controller('admin/blog-categories')
export class BlogCategoriesAdminController {
  constructor(private readonly blog: BlogService) {}

  @RequirePermissions('posts.write')
  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: [BlogTermDto] })
  async list() {
    return { data: await this.blog.listTerms('category') };
  }

  @RequirePermissions('posts.write')
  @Post()
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  async create(@Body() body: BlogTermInputDto, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    return { data: await this.blog.createTerm('category', body, actor, ctxOf(req)) };
  }

  @RequirePermissions('posts.write')
  @Patch(':id')
  @Header('Cache-Control', 'no-store')
  async update(@Param('id') id: string, @Body() body: UpdateBlogTermDto, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    return { data: await this.blog.updateTerm('category', id, body, actor, ctxOf(req)) };
  }

  @RequirePermissions('posts.write')
  @Post(':id/activate')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async activate(@Param('id') id: string, @Body() body: BlogTermStateDto, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    return { data: await this.blog.setTermActive('category', id, true, body.expectedVersion, actor, ctxOf(req)) };
  }

  @RequirePermissions('posts.write')
  @Post(':id/deactivate')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async deactivate(@Param('id') id: string, @Body() body: BlogTermStateDto, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    return { data: await this.blog.setTermActive('category', id, false, body.expectedVersion, actor, ctxOf(req)) };
  }
}

/** Editorial tags (SRS BLOG 005). */
@ApiTags('admin-blog')
@Controller('admin/blog-tags')
export class BlogTagsAdminController {
  constructor(private readonly blog: BlogService) {}

  @RequirePermissions('posts.write')
  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: [BlogTermDto] })
  async list() {
    return { data: await this.blog.listTerms('tag') };
  }

  @RequirePermissions('posts.write')
  @Post()
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  async create(@Body() body: BlogTermInputDto, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    return { data: await this.blog.createTerm('tag', body, actor, ctxOf(req)) };
  }

  @RequirePermissions('posts.write')
  @Patch(':id')
  @Header('Cache-Control', 'no-store')
  async update(@Param('id') id: string, @Body() body: UpdateBlogTermDto, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    return { data: await this.blog.updateTerm('tag', id, body, actor, ctxOf(req)) };
  }

  @RequirePermissions('posts.write')
  @Post(':id/activate')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async activate(@Param('id') id: string, @Body() body: BlogTermStateDto, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    return { data: await this.blog.setTermActive('tag', id, true, body.expectedVersion, actor, ctxOf(req)) };
  }

  @RequirePermissions('posts.write')
  @Post(':id/deactivate')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async deactivate(@Param('id') id: string, @Body() body: BlogTermStateDto, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    return { data: await this.blog.setTermActive('tag', id, false, body.expectedVersion, actor, ctxOf(req)) };
  }
}

/** Articles (SRS BLOG 001–003). Publication needs `posts.publish`; editing needs `posts.write`. */
@ApiTags('admin-blog')
@Controller('admin/posts')
export class PostsAdminController {
  constructor(private readonly blog: BlogService) {}

  @RequirePermissions('posts.write')
  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'List articles (status, category, tag, author, q, sort, order, page, pageSize)' })
  @ApiOkResponse({ type: [PostSummaryDto] })
  list(@Query() query: ListPostsQueryDto) {
    return this.blog.listPosts(query);
  }

  @RequirePermissions('posts.write')
  @Post()
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: PostDto })
  async create(@Body() body: CreatePostDto, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    return { data: await this.blog.createPost(body, actor, ctxOf(req)) };
  }

  @RequirePermissions('posts.write')
  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: PostDto })
  async get(@Param('id') id: string) {
    return { data: await this.blog.getPost(id) };
  }

  @RequirePermissions('posts.write')
  @Get(':id/preview')
  @Header('Cache-Control', 'no-store, private')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  @ApiOperation({ summary: 'Sanitised preview for authorised admins only; never public and never indexable (SRS BLOG 003)' })
  @ApiOkResponse({ type: PostPreviewDto })
  async preview(@Param('id') id: string) {
    return { data: await this.blog.preview(id) };
  }

  @RequirePermissions('posts.write')
  @Get(':id/revisions')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: [PostRevisionDto] })
  async revisions(@Param('id') id: string) {
    return { data: await this.blog.revisions(id) };
  }

  @RequirePermissions('posts.write')
  @Patch(':id')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: PostDto })
  async update(@Param('id') id: string, @Body() body: UpdatePostDto, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    return { data: await this.blog.updatePost(id, body, actor, ctxOf(req)) };
  }

  @RequirePermissions('posts.publish')
  @Post(':id/slug')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Change the public slug; a published article keeps a 301 from the old path (SRS SEO 004)' })
  @ApiOkResponse({ type: PostDto })
  async changeSlug(@Param('id') id: string, @Body() body: ChangeSlugDto, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    return { data: await this.blog.changeSlug(id, body, actor, ctxOf(req)) };
  }

  @RequirePermissions('posts.publish')
  @Post(':id/publish')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: PostDto })
  async publish(@Param('id') id: string, @Body() body: PostStateDto, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    return { data: await this.blog.transition(id, 'publish', body, actor, ctxOf(req)) };
  }

  @RequirePermissions('posts.publish')
  @Post(':id/schedule')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Schedule publication at a UTC instant chosen as Melbourne time' })
  @ApiOkResponse({ type: PostDto })
  async schedule(@Param('id') id: string, @Body() body: SchedulePostDto, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    return { data: await this.blog.transition(id, 'schedule', body, actor, ctxOf(req)) };
  }

  @RequirePermissions('posts.publish')
  @Post(':id/unpublish')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: PostDto })
  async unpublish(@Param('id') id: string, @Body() body: PostStateDto, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    return { data: await this.blog.transition(id, 'unpublish', body, actor, ctxOf(req)) };
  }

  @RequirePermissions('posts.publish')
  @Post(':id/archive')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: PostDto })
  async archive(@Param('id') id: string, @Body() body: PostStateDto, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    return { data: await this.blog.transition(id, 'archive', body, actor, ctxOf(req)) };
  }

  @RequirePermissions('posts.publish')
  @Post(':id/restore')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: PostDto })
  async restore(@Param('id') id: string, @Body() body: PostStateDto, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    return { data: await this.blog.transition(id, 'restore', body, actor, ctxOf(req)) };
  }
}
