import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentItem } from '../../entity/DocumentItem';
import * as uuid from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { EntityManager } from '@mikro-orm/mysql';
import { EntityItem } from 'src/entity/EntityItem';
import { DocumentTypeItem } from 'src/entity/DocumentTypeItem';

@Injectable()
export class DocumentService {
  constructor(private readonly em: EntityManager) {}

  async uploadDocument(
    file: Express.Multer.File,
    entityHandle: string,
    typeHandle: string,
    description?: string,
  ): Promise<DocumentItem> {
    const entity = await this.em.findOne(EntityItem, { handle: entityHandle });
    if (!entity) throw new NotFoundException('Entity not found');
    const type = await this.em.findOne(DocumentTypeItem, { handle: typeHandle });
    if (!type) throw new NotFoundException('Document type not found');

    const guid = uuid.v4() as string;
    const entityName = entity.constructor.name;
    const storageDir = path.join(__dirname, '../../../storage', entityName);
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    const filePath = path.join(storageDir, guid);
    fs.writeFileSync(filePath, file.buffer);

    const document = new DocumentItem();
    document.ownerHandle = entity.handle;
    document.path = `${entityName}/${guid}`;
    document.filename = file.originalname;
    document.mimetype = file.mimetype;
    document.length = file.size;
    document.description = description;
    document.entity = entity;
    document.type = type;
    await this.em.persistAndFlush(document);
    return document;
  }

  async downloadDocument(
    guid: string,
    entityName: string,
  ): Promise<{ filePath: string; document: DocumentItem }> {
    const pathString = `${entityName}/${guid}`;
    const document = await this.em.findOne(DocumentItem, { path: pathString });
    if (!document) throw new NotFoundException('Document not found');
    const filePath = path.join(__dirname, '../../../storage', entityName, guid);
    if (!fs.existsSync(filePath)) throw new NotFoundException('File not found');
    return { filePath, document };
  }
}
