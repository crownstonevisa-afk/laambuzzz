// Lightweight runtime formatter for the static article pages. It keeps the
// original article text intact, while turning packed source paragraphs into
// readable sections, lists, and FAQ accordions.

(() => {
  'use strict';

  const BODY_SELECTOR = '.article-body-content';
  const FAQ_LABEL = /(?:Frequently Asked Questions|FAQs?)(?:\s*\([^)]{0,30}\))?/i;

  const words = value => value.trim().split(/\s+/).filter(Boolean);
  const countWords = value => words(value).length;

  function splitByWords(text, maxWords) {
    const sourceWords = words(text);
    if (sourceWords.length <= maxWords) return [text.trim()];
    const chunks = [];
    for (let index = 0; index < sourceWords.length; index += maxWords) {
      chunks.push(sourceWords.slice(index, index + maxWords).join(' '));
    }
    return chunks;
  }

  function splitLongParagraph(text, maxWords = 78) {
    const normalized = text.replace(/\s+/g, ' ').trim();
    const sentences = normalized.match(/[^.!?]+[.!?]+(?:[”"'])?|[^.!?]+$/g) || [normalized];
    const result = [];
    let current = '';
    for (const sentence of sentences) {
      const clean = sentence.trim();
      if (!clean) continue;
      const sentenceParts = splitByWords(clean, maxWords);
      for (const sentencePart of sentenceParts) {
        if (current && countWords(current) + countWords(sentencePart) > maxWords) {
          result.push(current.trim());
          current = sentencePart;
        } else {
          current += (current ? ' ' : '') + sentencePart;
        }
      }
    }
    if (current.trim()) result.push(current.trim());
    return result;
  }

  function paragraphize(text) {
    return splitLongParagraph(text.replace(/\s+/g, ' ').trim());
  }

  function splitFaqText(text) {
    const entries = [];
    let cursor = 0;
    for (let expected = 1; expected <= 20; expected += 1) {
      const marker = new RegExp(`(?:^|\\s)${expected}\\.\\s+`, 'g');
      marker.lastIndex = cursor;
      const match = marker.exec(text);
      if (!match) break;
      const start = match.index + match[0].length;
      const nextMarker = new RegExp(`(?:^|\\s)${expected + 1}\\.\\s+`, 'g');
      nextMarker.lastIndex = start;
      const next = nextMarker.exec(text);
      const end = next ? next.index : text.length;
      const body = text.slice(start, end).trim();
      const questionEnd = body.indexOf('?');
      if (questionEnd < 0) break;
      entries.push({
        number: expected,
        question: body.slice(0, questionEnd + 1).trim(),
        answer: body.slice(questionEnd + 1).trim()
      });
      if (!next) break;
      cursor = next.index;
    }
    return entries;
  }

  function findFaqStart(text) {
    const explicit = text.search(/(?:Frequently Asked Questions|FAQs?)(?:\s*\([^)]{0,30}\))?/i);
    return explicit >= 0 ? explicit : -1;
  }



  function makeFaqSection(entries) {
    const section = document.createElement('section');
    section.className = 'article-faq-section';
    section.setAttribute('aria-labelledby', 'article-faq-heading');
    const heading = document.createElement('h2');
    heading.id = 'article-faq-heading';
    heading.textContent = 'Frequently Asked Questions';
    section.appendChild(heading);
    const list = document.createElement('div');
    list.className = 'faq-list';
    entries.forEach((entry, index) => {
      const item = document.createElement('article');
      item.className = 'faq-item';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'faq-question';
      button.id = `faq-question-${index + 1}`;
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-controls', `faq-answer-${index + 1}`);
      const question = document.createElement('span');
      question.className = 'faq-question-text';
      question.textContent = `${entry.number}. ${entry.question}`;
      const icon = document.createElement('span');
      icon.className = 'toggle-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '+';
      button.append(question, icon);
      const answer = document.createElement('div');
      answer.className = 'faq-answer';
      answer.id = `faq-answer-${index + 1}`;
      answer.setAttribute('role', 'region');
      answer.setAttribute('aria-labelledby', button.id);
      answer.hidden = true;
      const copy = document.createElement('div');
      copy.className = 'faq-answer-copy';
      paragraphize(entry.answer).forEach(text => {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        copy.appendChild(paragraph);
      });
      answer.appendChild(copy);
      item.append(button, answer);
      list.appendChild(item);
    });
    section.appendChild(list);
    return section;
  }

  function makeHeading(text, level = 2) {
    const heading = document.createElement(`h${level}`);
    heading.textContent = text;
    return heading;
  }

  function makeParagraph(text) {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    return paragraph;
  }

  function makeList(items, ordered = false) {
    const list = document.createElement(ordered ? 'ol' : 'ul');
    items.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      list.appendChild(li);
    });
    return list;
  }


  function splitListItems(text) {
    const bulletParts = text.split(/\s*●\s*/).map(part => part.trim()).filter(Boolean);
    if (bulletParts.length > 1) return { type: 'ul', items: bulletParts };
    const numberedParts = [];
    const pattern = /(?:^|\s)(\d{1,2})\.\s+/g;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const number = Number(match[1]);
      if (number !== numberedParts.length + 1) continue;
      const start = match.index + match[0].length;
      const next = text.slice(start).search(/\s+\d{1,2}\.\s+/);
      const end = next < 0 ? text.length : start + next;
      numberedParts.push(text.slice(start, end).trim());
    }
    if (numberedParts.length >= 2) return { type: 'ol', items: numberedParts };
    return null;
  }

  function isSectionHeading(text) {
    const value = text.trim();
    if (value.length < 8 || value.length > 110) return false;
    if (!HEADING_START.test(value)) return false;
    if (/[.!?]$/.test(value) && !value.includes('?')) return false;
    const firstWord = value.split(/\s+/)[0].replace(/^\d+\./, '');
    return /^[A-Z0-9]/.test(firstWord) && !/[,:;]$/.test(value);
  }

  function looksLikeTable(text) {
    return /(?:Situation|Reason for Denial|Factor|Record Type|Violation Type|Question|What It Contains|Why It Matters|Why It Usually Means|Common Ground)[\s\S]{0,180}\b(?:What|How|Why|When|Who|Does|Is|Are|Can|Should|Would|Will|Reason|Response|Factor|Type)\b/.test(text);
  }

  function renderContent(container, text) {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) return;

    const bulletMatches = [...normalized.matchAll(/\s*●\s*/g)];
    if (bulletMatches.length > 0) {
      const firstStart = bulletMatches[0].index + bulletMatches[0][0].length;
      const prefix = normalized.slice(0, bulletMatches[0].index).trim();
      if (prefix) paragraphize(prefix).forEach(part => container.appendChild(makeParagraph(part)));
      const items = [];
      for (let index = 0; index < bulletMatches.length; index += 1) {
        const start = bulletMatches[index].index + bulletMatches[index][0].length;
        const end = index + 1 < bulletMatches.length ? bulletMatches[index + 1].index : normalized.length;
        const item = normalized.slice(start, end).trim();
        if (item) items.push(item);
      }
      if (items.length) container.appendChild(makeList(items, false));
      return;
    }

    if (/^\d{1,2}\.\s+/.test(normalized)) {
      const numbered = splitListItems(normalized);
      if (numbered && numbered.type === 'ol') {
        container.appendChild(makeList(numbered.items, true));
        return;
      }
    }

    paragraphize(normalized).forEach(part => container.appendChild(makeParagraph(part)));
  }

  function splitConclusion(text) {
    const match = text.match(/(?:^|\s)(Conclusion)\s+/i);
    if (!match) return { body: text, conclusion: '' };
    const start = match.index + match[0].length;
    const faqStart = text.slice(start).search(/(?:Frequently Asked Questions|FAQs?)(?:\s*\([^)]{0,30}\))?/i);
    const conclusionEnd = faqStart < 0 ? text.length : start + faqStart;
    return {
      body: text.slice(0, match.index).trim(),
      conclusion: text.slice(start, conclusionEnd).trim()
    };
  }

  function extractFaq(source) {
    const explicitStart = findFaqStart(source);
    if (explicitStart < 0) return { before: source, entries: [] };
    const faqSource = source.slice(explicitStart).replace(FAQ_LABEL, '').trim();
    const entries = splitFaqText(faqSource);
    if (entries.length < 3) return { before: source, entries: [] };
    return {
      before: source.slice(0, explicitStart).trim(),
      entries
    };
  }

  function renderArticle(article) {
    const source = article.textContent.replace(/\s+/g, ' ').trim();
    if (!source || article.dataset.formatted === 'true') return;
    const extracted = extractFaq(source);
    const conclusionSplit = splitConclusion(extracted.before);
    const body = document.createDocumentFragment();
    const conclusion = document.createDocumentFragment();
    renderContent(body, conclusionSplit.body);
    if (conclusionSplit.conclusion) {
      conclusion.appendChild(makeHeading('Conclusion'));
      renderContent(conclusion, conclusionSplit.conclusion);
    }
    article.replaceChildren(body);
    if (conclusionSplit.conclusion) article.appendChild(conclusion);
    const entries = extracted.entries.filter(entry => entry.number > 0 && entry.question && entry.answer);
    if (entries.length >= 3) article.appendChild(makeFaqSection(entries));
    article.dataset.formatted = 'true';
  }

  function initArticleFormatting() {
    document.querySelectorAll(BODY_SELECTOR).forEach(renderArticle);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initArticleFormatting, { once: true });
  } else {
    initArticleFormatting();
  }
})();
