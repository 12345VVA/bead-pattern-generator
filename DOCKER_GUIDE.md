# Docker 镜像更新完整教程

## 目录

1. [更新流程概述](#更新流程概述)
2. [方法一：重新构建镜像（推荐）](#方法一重新构建镜像推荐)
3. [方法二：多版本管理](#方法二多版本管理)
4. [常见问题解决](#常见问题解决)
5. [附录：完整命令速查](#附录完整命令速查)

---

## 更新流程概述

```
代码修改 → 停止容器 → 删除旧容器 → 重新构建镜像 → 运行新容器
```

---

## 方法一：重新构建镜像（推荐）

### 步骤 1：修改代码

正常编辑你的项目代码，保存文件。

### 步骤 2：停止并删除旧容器

```bash
# 停止容器
docker stop bead-app

# 删除容器
docker rm bead-app
```

### 步骤 3：重新构建镜像

```bash
# 方式 A：覆盖旧镜像
docker build -t bead-pattern-generator:latest .

# 方式 B：带版本标签（推荐）
docker build -t bead-pattern-generator:v1.0.1 .
docker tag bead-pattern-generator:v1.0.1 bead-pattern-generator:latest
```

### 步骤 4：运行新容器

```bash
docker run -d -p 8080:80 --name bead-app bead-pattern-generator:latest
```

### 步骤 5：验证更新

```bash
# 查看容器状态
docker ps

# 查看日志
docker logs bead-app

# 浏览器访问
# http://localhost:8080
```

---

## 方法二：多版本管理

适合需要保留历史版本的情况。

### 构建带版本标签的镜像

```bash
# 构建新版本
docker build -t bead-pattern-generator:v1.0.2 .
docker tag bead-pattern-generator:v1.0.2 bead-pattern-generator:latest

# 查看所有镜像
docker images | grep bead-pattern-generator
```

### 切换版本

```bash
# 停止并删除当前容器
docker stop bead-app
docker rm bead-app

# 运行指定版本
docker run -d -p 8080:80 --name bead-app bead-pattern-generator:v1.0.1

# 或运行最新版本
docker run -d -p 8080:80 --name bead-app bead-pattern-generator:latest
```

### 清理旧版本

```bash
# 删除旧镜像
docker rmi bead-pattern-generator:v1.0.0

# 强制删除（如果容器正在使用）
docker rmi -f bead-pattern-generator:v1.0.0
```

---

## 常见问题解决

### 问题 1：端口被占用

```bash
# 查看端口占用
netstat -ano | findstr :8080

# 或者使用其他端口
docker run -d -p 8081:80 --name bead-app bead-pattern-generator:latest
```

### 问题 2：容器名称已存在

```bash
# 强制删除
docker rm -f bead-app

# 或使用新名称
docker run -d -p 8080:80 --name bead-app-v2 bead-pattern-generator:latest
```

### 问题 3：构建缓存导致更新未生效

```bash
# 清除构建缓存重新构建
docker build --no-cache -t bead-pattern-generator:latest .
```

### 问题 4：容器启动失败

```bash
# 查看详细日志
docker logs bead-app

# 进入容器检查
docker exec -it bead-app sh

# 检查 nginx 配置
docker exec bead-app cat /etc/nginx/conf.d/default.conf
```

### 问题 5：磁盘空间不足

```bash
# 清理未使用的镜像
docker image prune -a

# 清理未使用的容器
docker container prune

# 清理未使用的资源（镜像、容器、网络、构建缓存）
docker system prune -a

# 查看磁盘使用情况
docker system df
```

---

## 附录：完整命令速查

### 镜像相关

```bash
# 构建镜像
docker build -t bead-pattern-generator:latest .

# 构建带版本的镜像
docker build -t bead-pattern-generator:v1.0.0 .

# 查看所有镜像
docker images

# 删除镜像
docker rmi bead-pattern-generator:latest

# 导出镜像
docker save -o bead-pattern-generator.tar bead-pattern-generator:latest

# 导入镜像
docker load -i bead-pattern-generator.tar
```

### 容器相关

```bash
# 运行容器
docker run -d -p 8080:80 --name bead-app bead-pattern-generator:latest

# 查看运行中的容器
docker ps

# 查看所有容器（包括停止的）
docker ps -a

# 停止容器
docker stop bead-app

# 启动容器
docker start bead-app

# 重启容器
docker restart bead-app

# 删除容器
docker rm bead-app

# 强制删除运行中的容器
docker rm -f bead-app

# 查看容器日志
docker logs bead-app

# 查看实时日志
docker logs -f bead-app

# 进入容器
docker exec -it bead-app sh
```

### 批量更新脚本

创建一个 `rebuild.bat` 脚本（Windows）：

```batch
@echo off
echo 正在停止容器...
docker stop bead-app
docker rm bead-app

echo 正在重新构建镜像...
docker build -t bead-pattern-generator:latest .

echo 正在启动容器...
docker run -d -p 8080:80 --name bead-app bead-pattern-generator:latest

echo 更新完成！
echo 访问地址: http://localhost:8080
pause
```

创建一个 `rebuild.sh` 脚本（Linux/Mac）：

```bash
#!/bin/bash
echo "正在停止容器..."
docker stop bead-app
docker rm bead-app

echo "正在重新构建镜像..."
docker build -t bead-pattern-generator:latest .

echo "正在启动容器..."
docker run -d -p 8080:80 --name bead-app bead-pattern-generator:latest

echo "更新完成！"
echo "访问地址: http://localhost:8080"
```

使用方式：
```bash
# Windows
rebuild.bat

# Linux/Mac
chmod +x rebuild.sh
./rebuild.sh
```
