/**
 * Sync parsed markdown slides to the user's single Google Slides deck:
 * get or create deck, delete all slides, create BLANK slides and add title/body text boxes with InsertText.
 * Optional theme: accent bar, background color, title slide variant.
 */
import {google} from 'googleapis';
import type {OAuth2Client} from 'google-auth-library';
import type {Block, ParsedSlide} from './markdownSlides';
import {hexToRgb, type MarkdownSlideTheme} from './markdownTheme';

const DECK_TITLE = 'slides2gif';

/** Default slide size in PT (10" x 7.5") */
const PAGE_WIDTH_PT = 720;
const PAGE_HEIGHT_PT = 540;
const MARGIN_PT = 40;
const TITLE_HEIGHT_PT = 56;
const TITLE_Y_PT = 40;
const TITLE_BODY_GAP_PT = 8;
const BODY_Y_PT = TITLE_Y_PT + TITLE_HEIGHT_PT + TITLE_BODY_GAP_PT;
const BODY_HEIGHT_PT = PAGE_HEIGHT_PT - BODY_Y_PT - MARGIN_PT;
const CONTENT_WIDTH_PT = PAGE_WIDTH_PT - 2 * MARGIN_PT;

const TITLE_FONT_SIZE_PT = 34;
const BODY_FONT_SIZE_PT = 14;
/** H2–H6 font sizes (H1 = title uses TITLE_FONT_SIZE_PT) */
const HEADING_FONT_SIZE_PT: Record<number, number> = {
  2: 24,
  3: 20,
  4: 18,
  5: 16,
  6: 14,
};
const LINE_HEIGHT_PT = 18;
const BLOCK_GAP_PT = 6;
const ACCENT_BAR_HEIGHT_PT = 8;
/** 1 PT = 914400/72 EMU (Slides API uses EMU for image size/transform) */
const PT_TO_EMU = 914400 / 72;
function ptToEmu(pt: number): number {
  return Math.round(pt * PT_TO_EMU);
}

/** Near-black for title (H1) so it reads clearly, not faded */
const TITLE_COLOR = {r: 0.06, g: 0.06, b: 0.1};
/** Gray for body text (H2 and below) */
const BODY_COLOR = {r: 0.278, g: 0.333, b: 0.412};

export interface SyncResult {
  presentationId: string;
  /** Same order as parsed slides; objectId from Slides API */
  slides: {objectId: string; contentHash: string}[];
}

/**
 * Get existing presentation or create a new one (Slides API creates in user's Drive).
 */
export async function getOrCreatePresentation(
  auth: OAuth2Client,
  existingPresentationId: string | null
): Promise<{presentationId: string; created: boolean}> {
  if (existingPresentationId) {
    try {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const slides = google.slides({version: 'v1', auth: auth as any});
      await slides.presentations.get({
        presentationId: existingPresentationId,
        fields: 'presentationId',
      });
      return {presentationId: existingPresentationId, created: false};
    } catch {
      // Not found or no access; create new
    }
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const slides = google.slides({version: 'v1', auth: auth as any});
  const created = await slides.presentations.create({
    requestBody: {title: DECK_TITLE},
  });
  const presentationId = created.data.presentationId;
  if (!presentationId) {
    throw new Error('Slides API did not return presentationId');
  }
  return {presentationId, created: true};
}

function isTitleSlide(slide: ParsedSlide, index: number): boolean {
  if (index === 0) return true;
  const body = (slide.body || '').trim();
  return body.length < 40;
}

/** Build OpaqueColor for Slides API from rgb 0-1 */
function opaqueColor(r: number, g: number, b: number) {
  return {opaqueColor: {rgbColor: {red: r, green: g, blue: b}}};
}

/** Build color for shape fill (solidFill.color) */
function fillColor(r: number, g: number, b: number) {
  return {rgbColor: {red: r, green: g, blue: b}};
}

/**
 * Delete all slides, create BLANK slides, then add background (optional), accent bar (optional),
 * title and body TEXT_BOX shapes with InsertText and styling.
 */
export async function syncSlidesToPresentation(
  auth: OAuth2Client,
  presentationId: string,
  parsedSlides: ParsedSlide[],
  theme?: MarkdownSlideTheme
): Promise<SyncResult> {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const slides = google.slides({version: 'v1', auth: auth as any});

  const pres = await slides.presentations.get({
    presentationId,
    fields: 'slides(objectId)',
  });
  const pageIds = (pres.data.slides ?? [])
    .map(s => s.objectId)
    .filter(Boolean) as string[];

  const deleteRequests = pageIds.map(objectId => ({deleteObject: {objectId}}));
  if (deleteRequests.length > 0) {
    await slides.presentations.batchUpdate({
      presentationId,
      requestBody: {requests: deleteRequests},
    });
  }

  if (parsedSlides.length === 0) {
    return {presentationId, slides: []};
  }

  const createSlideRequests = parsedSlides.map((_, i) => ({
    createSlide: {
      insertionIndex: i,
      slideLayoutReference: {predefinedLayout: 'BLANK'},
    },
  }));

  const createRes = await slides.presentations.batchUpdate({
    presentationId,
    requestBody: {requests: createSlideRequests},
  });

  const createdPageIds: string[] = [];
  for (const reply of createRes.data.replies ?? []) {
    const createSlide = reply.createSlide as {objectId?: string} | undefined;
    if (createSlide?.objectId) {
      createdPageIds.push(createSlide.objectId);
    }
  }

  if (createdPageIds.length !== parsedSlides.length) {
    throw new Error(
      `Created ${createdPageIds.length} slides but expected ${parsedSlides.length}`
    );
  }

  const hasTheme = theme?.accentColor ?? theme?.backgroundColor;
  const shapeRequests: Array<Record<string, unknown>> = [];

  for (let i = 0; i < parsedSlides.length; i++) {
    const pageId = createdPageIds[i];
    const slide = parsedSlides[i];
    const titleId = `title_${i}`;
    const bodyId = `body_${i}`;
    const isTitle = isTitleSlide(slide, i);

    const bgColor =
      theme?.backgroundColor != null ? hexToRgb(theme.backgroundColor) : null;
    const titleSlideBg =
      isTitle && bgColor
        ? {
            r: Math.min(1, bgColor.r + 0.02),
            g: Math.min(1, bgColor.g + 0.02),
            b: Math.min(1, bgColor.b + 0.02),
          }
        : bgColor;
    const slideBg = titleSlideBg ?? bgColor ?? {r: 1, g: 1, b: 1};

    if (hasTheme) {
      const bgId = `back_${i}`;
      shapeRequests.push({
        createShape: {
          objectId: bgId,
          shapeType: 'RECTANGLE',
          elementProperties: {
            pageObjectId: pageId,
            size: {
              width: {magnitude: PAGE_WIDTH_PT, unit: 'PT'},
              height: {magnitude: PAGE_HEIGHT_PT, unit: 'PT'},
            },
            transform: {
              translateX: 0,
              translateY: 0,
              scaleX: 1,
              scaleY: 1,
              unit: 'PT',
            },
          },
        },
      });
      shapeRequests.push({
        updateShapeProperties: {
          objectId: bgId,
          shapeProperties: {
            shapeBackgroundFill: {
              solidFill: {
                color: fillColor(slideBg.r, slideBg.g, slideBg.b),
                alpha: 1,
              },
            },
          },
          fields:
            'shapeBackgroundFill.solidFill.color,shapeBackgroundFill.solidFill.alpha',
        },
      });
    }

    if (theme?.accentColor) {
      const accentId = `accent_${i}`;
      const accentRgb = hexToRgb(theme.accentColor);
      shapeRequests.push({
        createShape: {
          objectId: accentId,
          shapeType: 'RECTANGLE',
          elementProperties: {
            pageObjectId: pageId,
            size: {
              width: {magnitude: PAGE_WIDTH_PT, unit: 'PT'},
              height: {magnitude: ACCENT_BAR_HEIGHT_PT, unit: 'PT'},
            },
            transform: {
              translateX: 0,
              translateY: 0,
              scaleX: 1,
              scaleY: 1,
              unit: 'PT',
            },
          },
        },
      });
      shapeRequests.push({
        updateShapeProperties: {
          objectId: accentId,
          shapeProperties: {
            shapeBackgroundFill: {
              solidFill: {
                color: fillColor(accentRgb.r, accentRgb.g, accentRgb.b),
                alpha: 1,
              },
            },
          },
          fields:
            'shapeBackgroundFill.solidFill.color,shapeBackgroundFill.solidFill.alpha',
        },
      });
    }

    const titleY =
      theme?.accentColor != null
        ? TITLE_Y_PT + ACCENT_BAR_HEIGHT_PT
        : TITLE_Y_PT;
    const bodyY = titleY + TITLE_HEIGHT_PT + TITLE_BODY_GAP_PT;
    const bodyHeightPt = PAGE_HEIGHT_PT - bodyY - MARGIN_PT;

    shapeRequests.push({
      createShape: {
        objectId: titleId,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: pageId,
          size: {
            width: {magnitude: CONTENT_WIDTH_PT, unit: 'PT'},
            height: {magnitude: TITLE_HEIGHT_PT, unit: 'PT'},
          },
          transform: {
            translateX: MARGIN_PT,
            translateY: titleY,
            scaleX: 1,
            scaleY: 1,
            unit: 'PT',
          },
        },
      },
    });
    shapeRequests.push({
      insertText: {
        objectId: titleId,
        text: slide.title || ' ',
        insertionIndex: 0,
      },
    });
    const titleColorRgb = theme?.titleFontColor
      ? hexToRgb(theme.titleFontColor)
      : isTitle && theme?.accentColor
        ? hexToRgb(theme.accentColor)
        : TITLE_COLOR;
    shapeRequests.push({
      updateTextStyle: {
        objectId: titleId,
        textRange: {type: 'ALL'},
        style: {
          fontSize: {magnitude: TITLE_FONT_SIZE_PT, unit: 'PT'},
          bold: true,
          foregroundColor: opaqueColor(
            titleColorRgb.r,
            titleColorRgb.g,
            titleColorRgb.b
          ),
          fontFamily: 'Arial',
        },
        fields: 'fontSize,bold,foregroundColor,fontFamily',
      },
    });

    const bodyColorRgb = theme?.bodyFontColor
      ? hexToRgb(theme.bodyFontColor)
      : BODY_COLOR;

    const blocks = slide.blocks ?? [];
    const imageBlocks = blocks.filter(
      (b): b is Block & {type: 'image'} => b.type === 'image'
    );
    const oneImageFullSlide = imageBlocks.length === 1 && blocks.length === 1;
    const twoImagesOnly = imageBlocks.length === 2 && blocks.length === 2;

    let currentY = bodyY;
    const maxY = PAGE_HEIGHT_PT - MARGIN_PT;

    for (let j = 0; j < blocks.length; j++) {
      const block = blocks[j];
      const blockId = `block_${i}_${j}`;

      if (block.type === 'heading') {
        const fontSize = HEADING_FONT_SIZE_PT[block.level] ?? BODY_FONT_SIZE_PT;
        const boxHeight = Math.max(LINE_HEIGHT_PT, fontSize * 1.2);
        if (currentY + boxHeight > maxY) break;
        shapeRequests.push(
          createTextBoxRequest(
            pageId,
            blockId,
            currentY,
            CONTENT_WIDTH_PT,
            boxHeight
          )
        );
        shapeRequests.push({
          insertText: {
            objectId: blockId,
            text: block.text || ' ',
            insertionIndex: 0,
          },
        });
        shapeRequests.push({
          updateTextStyle: {
            objectId: blockId,
            textRange: {type: 'ALL'},
            style: {
              fontSize: {magnitude: fontSize, unit: 'PT'},
              bold: true,
              foregroundColor: opaqueColor(
                bodyColorRgb.r,
                bodyColorRgb.g,
                bodyColorRgb.b
              ),
              fontFamily: 'Arial',
            },
            fields: 'fontSize,bold,foregroundColor,fontFamily',
          },
        });
        currentY += boxHeight + BLOCK_GAP_PT;
        continue;
      }

      if (block.type === 'paragraph' || block.type === 'blockquote') {
        const lines = Math.max(1, Math.ceil(block.text.length / 48));
        const boxHeight = Math.min(lines * LINE_HEIGHT_PT, bodyHeightPt - 20);
        if (currentY + boxHeight > maxY) break;
        shapeRequests.push(
          createTextBoxRequest(
            pageId,
            blockId,
            currentY,
            CONTENT_WIDTH_PT,
            boxHeight
          )
        );
        shapeRequests.push({
          insertText: {
            objectId: blockId,
            text: block.text || ' ',
            insertionIndex: 0,
          },
        });
        shapeRequests.push({
          updateTextStyle: {
            objectId: blockId,
            textRange: {type: 'ALL'},
            style: {
              fontSize: {magnitude: BODY_FONT_SIZE_PT, unit: 'PT'},
              foregroundColor: opaqueColor(
                bodyColorRgb.r,
                bodyColorRgb.g,
                bodyColorRgb.b
              ),
              fontFamily: 'Arial',
            },
            fields: 'fontSize,foregroundColor,fontFamily',
          },
        });
        currentY += boxHeight + BLOCK_GAP_PT;
        continue;
      }

      if (block.type === 'list') {
        const text = block.items.map(it => `• ${it}`).join('\n');
        const lines = block.items.length;
        const boxHeight = Math.min(lines * LINE_HEIGHT_PT, bodyHeightPt - 20);
        if (currentY + boxHeight > maxY) break;
        shapeRequests.push(
          createTextBoxRequest(
            pageId,
            blockId,
            currentY,
            CONTENT_WIDTH_PT,
            boxHeight
          )
        );
        shapeRequests.push({
          insertText: {
            objectId: blockId,
            text: text || ' ',
            insertionIndex: 0,
          },
        });
        shapeRequests.push({
          updateTextStyle: {
            objectId: blockId,
            textRange: {type: 'ALL'},
            style: {
              fontSize: {magnitude: BODY_FONT_SIZE_PT, unit: 'PT'},
              foregroundColor: opaqueColor(
                bodyColorRgb.r,
                bodyColorRgb.g,
                bodyColorRgb.b
              ),
              fontFamily: 'Arial',
            },
            fields: 'fontSize,foregroundColor,fontFamily',
          },
        });
        currentY += boxHeight + BLOCK_GAP_PT;
        continue;
      }

      if (block.type === 'image') {
        let imgWidthPt: number;
        let imgHeightPt: number;
        let translateXPt: number;
        if (oneImageFullSlide && imageBlocks.length === 1) {
          imgWidthPt = CONTENT_WIDTH_PT;
          imgHeightPt = bodyHeightPt;
          translateXPt = MARGIN_PT;
        } else if (twoImagesOnly && imageBlocks.length === 2) {
          imgWidthPt = (CONTENT_WIDTH_PT - BLOCK_GAP_PT) / 2;
          imgHeightPt = bodyHeightPt;
          const colIndex = imageBlocks[0] === block ? 0 : 1;
          translateXPt = MARGIN_PT + colIndex * (imgWidthPt + BLOCK_GAP_PT);
        } else {
          imgWidthPt = CONTENT_WIDTH_PT;
          imgHeightPt = 200;
          translateXPt = MARGIN_PT;
        }
        if (
          currentY + imgHeightPt > maxY &&
          !oneImageFullSlide &&
          !twoImagesOnly
        )
          break;
        const imgY = oneImageFullSlide || twoImagesOnly ? bodyY : currentY;
        shapeRequests.push({
          createImage: {
            objectId: blockId,
            url: block.url,
            elementProperties: {
              pageObjectId: pageId,
              size: {
                width: {magnitude: ptToEmu(imgWidthPt), unit: 'EMU'},
                height: {magnitude: ptToEmu(imgHeightPt), unit: 'EMU'},
              },
              transform: {
                scaleX: 1,
                scaleY: 1,
                translateX: ptToEmu(translateXPt),
                translateY: ptToEmu(imgY),
                unit: 'EMU',
              },
            },
          },
        });
        if (!oneImageFullSlide && !twoImagesOnly)
          currentY += imgHeightPt + BLOCK_GAP_PT;
        else if (twoImagesOnly && imageBlocks[1] === block)
          currentY = bodyY + imgHeightPt + BLOCK_GAP_PT;
        continue;
      }

      if (block.type === 'table') {
        const rows = [block.headers, ...block.rows];
        const numRows = rows.length;
        const numCols = Math.max(1, ...rows.map(r => r.length));
        const tableId = blockId;
        shapeRequests.push({
          createTable: {
            objectId: tableId,
            elementProperties: {
              pageObjectId: pageId,
            },
            rows: numRows,
            columns: numCols,
          },
        });
        for (let r = 0; r < numRows; r++) {
          for (let c = 0; c < numCols; c++) {
            const cellText = rows[r][c] ?? '';
            shapeRequests.push({
              insertText: {
                objectId: tableId,
                cellLocation: {rowIndex: r, columnIndex: c},
                text: cellText,
                insertionIndex: 0,
              },
            });
          }
        }
        const tableHeightPt = numRows * 28;
        currentY += tableHeightPt + BLOCK_GAP_PT;
        continue;
      }
    }
  }

  await slides.presentations.batchUpdate({
    presentationId,
    requestBody: {requests: shapeRequests},
  });

  return {
    presentationId,
    slides: parsedSlides.map((p, i) => ({
      objectId: createdPageIds[i],
      contentHash: p.contentHash,
    })),
  };
}

function createTextBoxRequest(
  pageObjectId: string,
  objectId: string,
  translateY: number,
  width: number,
  height: number
): Record<string, unknown> {
  return {
    createShape: {
      objectId,
      shapeType: 'TEXT_BOX',
      elementProperties: {
        pageObjectId,
        size: {
          width: {magnitude: width, unit: 'PT'},
          height: {magnitude: height, unit: 'PT'},
        },
        transform: {
          translateX: MARGIN_PT,
          translateY,
          scaleX: 1,
          scaleY: 1,
          unit: 'PT',
        },
      },
    },
  };
}
