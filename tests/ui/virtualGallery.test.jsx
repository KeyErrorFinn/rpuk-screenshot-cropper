import { act, render, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import VirtualGallery from "../../src/renderer/src/components/VirtualGallery.jsx";

let observers;
beforeEach(() => {
    observers = [];
    global.IntersectionObserver = class {
        constructor(callback) { this.callback = callback; observers.push(this); }
        observe() {}
        disconnect() {}
    };
});

test("mounts only rows near the viewport and unmounts them after scrolling away", () => {
    render(<VirtualGallery columns={2} items={[{ key: "one" }, { key: "two" }, { key: "three" }]} renderItem={item => <button key={item.key}>{item.key}</button>} />);
    expect(screen.queryByText("one")).not.toBeInTheDocument();
    act(() => observers[0].callback([{ isIntersecting: true }]));
    expect(screen.getByText("one")).toBeInTheDocument();
    expect(screen.getByText("two")).toBeInTheDocument();
    expect(screen.queryByText("three")).not.toBeInTheDocument();
    act(() => observers[0].callback([{ isIntersecting: false }]));
    expect(screen.queryByText("one")).not.toBeInTheDocument();
});

test("keeps keyboard-focusable gallery controls semantic when mounted", () => {
    render(<VirtualGallery columns={1} items={[{ key: "shot" }]} renderItem={item => <button key={item.key} aria-label={`Open ${item.key}`}>{item.key}</button>} />);
    act(() => observers[0].callback([{ isIntersecting: true }]));
    expect(screen.getByRole("button", { name: "Open shot" })).toBeEnabled();
});
