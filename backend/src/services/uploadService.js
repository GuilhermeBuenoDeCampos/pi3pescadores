const fs = require('fs');
const path = require('path');

class UploadService {
  sanitizeFilename(filename) {
    const ext = path.extname(filename).toLowerCase();
    const nameOnly = path.basename(filename, path.extname(filename));
    const safeName = nameOnly
      .replace(/[^a-zA-Z0-9-_.]/g, '-')
      .replace(/-+/g, '-')
      .replace(/(^-|-$)/g, '');

    return `${safeName || 'imagem'}${ext}`;
  }

  getUniqueLocalPath(directory, filename) {
    const ext = path.extname(filename);
    const nameOnly = path.basename(filename, ext);
    let candidate = filename;
    let counter = 1;

    while (fs.existsSync(path.join(directory, candidate))) {
      candidate = `${nameOnly}-${counter}${ext}`;
      counter += 1;
    }

    return {
      filename: candidate,
      filePath: path.join(directory, candidate),
    };
  }

  saveLocalFile(filePath, originalFilename) {
    const uploadDirectory = path.dirname(filePath);
    const sanitizedFilename = this.sanitizeFilename(originalFilename);
    const currentFilename = path.basename(filePath);

    if (currentFilename === sanitizedFilename) {
      return `/uploads/${sanitizedFilename}`;
    }

    const destination = this.getUniqueLocalPath(uploadDirectory, sanitizedFilename);
    fs.renameSync(filePath, destination.filePath);

    return `/uploads/${destination.filename}`;
  }

  async uploadMultipleFiles(files) {
    return files.map((file) => this.saveLocalFile(file.path, path.basename(file.path)));
  }
}

module.exports = new UploadService();
